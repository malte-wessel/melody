import { useCallback } from './useCallback';
import { useState } from './useState';
import { useEffect } from './useEffect';
import { usePrevious } from './usePrevious';
import { useRef } from './useRef';
import { shallowEqualsScalar } from '../util/shallowEquals';

// We use a lot of selectors that access props when used with `melody-redux` e.g:
// const selector = (state, props) => state[props.id]
// These type of selectors don't make sense with melody-hooks
// therefore we warn the developer.
let props;
if (process.env.NODE_ENV !== 'production') {
    const target = {};
    const handler = {
        get: () => {
            throw new Error(
                'useStore: You tried to access `props` in a selector. ' +
                    '`props` cannot be passed to selectors. ' +
                    'Instead use properties from outside of the selector function'
            );
        },
    };
    props = new Proxy(target, handler);
}

/**
 * Runs `selector` on `store.getState`. Does a shallow equal compare
 * against `state`. If states are equal it returns the passed state,
 * if not it returns the new one.
 * @param {Object} state The current state
 * @param {Function} selector A selector function
 * @param {Store} store A redux store instance
 */
const selectState = (state, selector, store) => {
    const stateNext = selector(store.getState(), props);

    // We use a lot of selector creators with `melody-redux` in our code base, e.g:
    // const createMapStateToProps = () => createSelector(...)
    // These type of selectors don't make sense with melody-hooks
    // therefore we warn the developer.
    if (process.env.NODE_ENV !== 'production') {
        if (typeof stateNext === 'function') {
            throw new Error(
                'useStore: the selector that was passed to useStore returned a function. ' +
                    'This might be because you tried to pass a selector creator. ' +
                    'This is not allowed with melody-hooks'
            );
        }
    }

    if (shallowEqualsScalar(state, stateNext)) {
        return state;
    }
    return stateNext;
};

/**
 * Subscribes to the given store. When the selected state changes,
 * it sets `stateRef.current` to the new value and calls `onChange`.
 * Returns an unsubscribe function
 * @param {Store} store A redux store instance
 * @param {Ref} stateRef A melody-hooks ref of the current state
 * @param {Ref} selectorRef A melody-hooks ref of the current selector
 * @param {Function} onChange called when the selected state changes
 */
const subscribeToStore = (store, stateRef, selectorRef, onChange) =>
    store.subscribe(() => {
        const stateRefCurrent = stateRef.current;
        const stateNext = selectState(
            stateRefCurrent,
            selectorRef.current,
            store
        );
        if (stateNext !== stateRefCurrent) {
            stateRef.current = stateNext;
            onChange();
        }
    });

const defaultSelector = state => state;

const STATE_NOT_INITIALIZED = Symbol('STATE_NOT_INITIALIZED');

/**
 * A melody hook for subscribing to a redux store.
 * @param {*} store A redux store instance
 * @param {*} selector A selector function
 */
export const useStore = (store, selector = defaultSelector) => {
    // Holds the current selected state
    const stateRef = useRef(STATE_NOT_INITIALIZED);

    // Reference to the current selector, used inside the useEffect hook.
    // This way we don't need to resubscribe when selector changes
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    // Force update is used within the store subscription, whenever
    // the selected state changed due to a store update, we force
    // an update
    const [, setN] = useState(0);
    const forceUpdate = useCallback(() => setN(n => n + 1), []);

    // Used to detect changes of store and selector
    const prevStore = usePrevious(store);
    const prevSelector = usePrevious(selector);

    // Under the following conditions we run the select functions
    if (
        // The passed selector changed
        selector !== prevSelector ||
        // The passed store changed
        store !== prevStore ||
        // The state was never initialized
        stateRef.current === STATE_NOT_INITIALIZED
    ) {
        stateRef.current = selectState(stateRef.current, selector, store);
    }

    useEffect(
        () => subscribeToStore(store, stateRef, selectorRef, forceUpdate),
        [store]
    );

    return stateRef.current;
};
