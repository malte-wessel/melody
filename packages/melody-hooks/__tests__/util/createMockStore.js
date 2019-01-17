import { createStore } from 'redux';

const defaultInitialState = {
    foo: 'bar',
};
export const createMockStore = (initialState = defaultInitialState) => {
    const reducer = (state = initialState, action) => {
        if (action.type === 'SET') {
            return {
                ...state,
                foo: action.payload,
            };
        }
        return state;
    };

    return createStore(reducer);
};
