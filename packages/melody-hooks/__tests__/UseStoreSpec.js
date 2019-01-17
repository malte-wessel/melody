import { elementOpen, elementClose, text, component } from 'melody-idom';
import { createComponent, useState, useStore } from '../src';
import { createTestComponent } from './util/createTestComponent';
import { createMockStore } from './util/createMockStore';

let store;
beforeEach(() => {
    store = createMockStore();
});

describe('@trivago/hooks', () => {
    describe('useStore', () => {
        describe('basic functionality', () => {
            const selector = state => ({ qux: state.foo });
            const componentFn = props => {
                const state = useStore(store, selector);
                return state;
            };
            it('should render the initial state', () => {
                const tester = createTestComponent(componentFn);

                tester.render();
                expect(tester.getData()).toEqual({ qux: 'bar' });
                expect(tester.getCallCount()).toEqual(1);
                tester.unmount();
            });
            it('should rerender when selected data changes', () => {
                const tester = createTestComponent(componentFn);

                tester.render();
                expect(tester.getData()).toEqual({ qux: 'bar' });

                store.dispatch({ type: 'SET', payload: 'woo' });
                tester.flush();
                expect(tester.getData()).toEqual({ qux: 'woo' });
                expect(tester.getCallCount()).toEqual(2);

                tester.unmount();
            });
            it('should not rerender when selected value is shallowly equal', () => {
                const componentFn = props => {
                    const state = useStore(store, state => ({
                        iso: state.foo,
                        osi: state.foo + state.foo,
                    }));
                    return state;
                };
                const tester = createTestComponent(componentFn);

                tester.render();
                expect(tester.getData()).toEqual({ iso: 'bar', osi: 'barbar' });

                store.dispatch({ type: 'SET', payload: 'bar' });
                tester.flush();
                expect(tester.getCallCount()).toEqual(1);

                tester.unmount();
            });
            it('should rerender when a new selector function is passed', () => {
                let update;
                const componentFn = props => {
                    const [bar, setBar] = useState('qux');
                    update = setBar;
                    const selector = state => ({
                        qux: state.foo + bar,
                    });
                    // `selector` is recreated on every cycle
                    const state = useStore(store, selector);
                    return state;
                };
                const tester = createTestComponent(componentFn);
                tester.render();
                expect(tester.getData()).toEqual({ qux: 'barqux' });

                update('foo');
                tester.flush();
                expect(tester.getData()).toEqual({ qux: 'barfoo' });
                expect(tester.getCallCount()).toEqual(2);

                tester.unmount();
            });
            it('should not rerender when the same selector function is passed', () => {
                let update;
                let selectorCalledCount = 0;
                const selector = state => {
                    selectorCalledCount++;
                    return {
                        qux: state.foo,
                    };
                };
                const componentFn = props => {
                    const [, setBar] = useState('qux');
                    update = setBar;
                    // `selector` is always the same
                    const state = useStore(store, selector);
                    return state;
                };
                const tester = createTestComponent(componentFn);
                tester.render();
                update('foo');
                tester.flush();
                expect(selectorCalledCount).toEqual(1);
                expect(tester.getCallCount()).toEqual(2);

                tester.unmount();
            });
            it('should rerender when the store changes', () => {
                const store2 = createMockStore({ foo: 'nom' });
                const componentFn = props => {
                    const storeToUse = props.switch ? store2 : store;
                    const state = useStore(storeToUse, selector);
                    return state;
                };
                const tester = createTestComponent(componentFn);
                tester.render({ switch: false });
                expect(tester.getData()).toEqual({ qux: 'bar' });
                tester.render({ switch: true });
                expect(tester.getData()).toEqual({ qux: 'nom' });
                expect(tester.getCallCount()).toEqual(2);

                tester.unmount();
            });
        });
        describe('selector', () => {
            // @TODO: Fix melody bug with currentComponent not resetted when an error was thrown
            it('should throw when you try to access props', () => {
                const componentFn = props => {
                    const state = useStore(store, (state, props) => ({
                        qux: props.foo,
                    }));
                    return state;
                };
                const tester = createTestComponent(componentFn);

                expect(() => tester.render()).toThrow(
                    'useStore: You tried to access `props` in a selector. `props` cannot be passed to selectors. Instead use properties from outside of the selector function'
                );
                tester.unmount();
            });
            it('should throw when you pass a selector creator', () => {
                const createSelector = () => state => state.foo;
                const componentFn = props => {
                    const state = useStore(store, createSelector);
                    return state;
                };
                const tester = createTestComponent(componentFn);

                expect(() => tester.render()).toThrow(
                    'useStore: the selector that was passed to useStore returned a function. This might be because you tried to pass a selector creator. This is not allowed with melody-hooks'
                );
                tester.unmount();
            });
            it('should not resubscribe when selector changes', () => {
                const componentFn = props => {
                    const selector = state => ({
                        qux: state.foo,
                    });
                    // `selector` is recreated on every cycle
                    const state = useStore(store, selector);
                    return state;
                };
                const tester = createTestComponent(componentFn);
                const spy = jest.spyOn(store, 'subscribe');

                tester.render();
                store.dispatch({ type: 'SET', payload: 'woo' });
                tester.flush();
                expect(tester.getData()).toEqual({ qux: 'woo' });
                expect(spy.mock.calls).toHaveLength(1);

                spy.mockRestore();
                tester.unmount();
            });
            it('should support scalar values', () => {
                const selector = state => state.foo;
                const componentFn = props => {
                    const state = useStore(store, selector);
                    return state;
                };
                const tester = createTestComponent(componentFn);

                tester.render();
                expect(tester.getData()).toEqual('bar');
                expect(tester.getCallCount()).toEqual(1);
                tester.unmount();
            });
            it('should support arrays', () => {
                const selector = state => ['foo', state.foo];
                const componentFn = props => {
                    const state = useStore(store, selector);
                    return state;
                };
                const tester = createTestComponent(componentFn);

                tester.render();
                expect(tester.getData()).toEqual(['foo', 'bar']);
                expect(tester.getCallCount()).toEqual(1);
                tester.unmount();
            });
        });
        describe('store', () => {
            it('should resubscribe when the store changes', () => {
                const store2 = createMockStore({ foo: 'nom' });
                const componentFn = props => {
                    const storeToUse = props.switch ? store2 : store;
                    const state = useStore(storeToUse, state => ({
                        qux: state.foo,
                    }));
                    return state;
                };
                const tester = createTestComponent(componentFn);
                const spy = jest.spyOn(store, 'subscribe');

                tester.render({ switch: false });
                expect(tester.getData()).toEqual({ qux: 'bar' });
                tester.render({ switch: true });
                expect(tester.getData()).toEqual({ qux: 'nom' });
                expect(spy.mock.calls).toHaveLength(1);

                spy.mockRestore();
                tester.unmount();
            });
        });
        describe('complex component tree', () => {
            it('should work', () => {
                const store = createMockStore({
                    foo: 'nom',
                    qux: 'qax',
                });

                const selector = state => ({
                    value: state.foo + state.qux,
                });

                let componentARendered = 0;
                let componentACalled = 0;

                const A = createComponent(
                    () => {
                        componentACalled++;
                        const state = useStore(store, selector);
                        return {
                            value: `${state.value}A`,
                        };
                    },
                    {
                        render(_context) {
                            componentARendered++;
                            elementOpen('span');
                            text(_context.value);
                            elementClose('span');
                        },
                    }
                );

                const tester = createTestComponent(
                    () => {
                        const state = useStore(store, selector);
                        return {
                            value: `${state.value}Root`,
                        };
                    },
                    {
                        render(_context) {
                            elementOpen('div');
                            text(_context.value);
                            component(A, '1');
                            elementClose('div');
                        },
                    }
                );

                tester.render();
                expect(tester.getHtml()).toEqual(
                    '<div>nomqaxRoot<span>nomqaxA</span></div>'
                );
                expect(tester.getCallCount()).toEqual(1);
                expect(tester.getRenderCount()).toEqual(1);
                expect(componentACalled).toEqual(1);
                expect(componentARendered).toEqual(1);

                store.dispatch({ type: 'SET', payload: 'woo' });
                tester.flush();
                expect(tester.getHtml()).toEqual(
                    '<div>wooqaxRoot<span>wooqaxA</span></div>'
                );
                expect(tester.getCallCount()).toEqual(2);
                expect(tester.getRenderCount()).toEqual(2);

                expect(componentACalled).toEqual(2);
                expect(componentARendered).toEqual(2);

                store.dispatch({ type: 'SET', payload: 'doo' });
                tester.flush();
                expect(tester.getHtml()).toEqual(
                    '<div>dooqaxRoot<span>dooqaxA</span></div>'
                );
                expect(tester.getCallCount()).toEqual(3);
                expect(tester.getRenderCount()).toEqual(3);
                expect(componentACalled).toEqual(3);
                expect(componentARendered).toEqual(3);
            });
        });
    });
    describe('multiple hooks', () => {
        it('should work', () => {
            const selector = state => ({ qux: state.foo });
            const componentFn = props => {
                const state = useStore(store, selector);
                const state2 = useStore(store, selector);
                return {
                    state,
                    state2,
                };
            };
            const tester = createTestComponent(componentFn);

            tester.render();
            expect(tester.getData()).toEqual({
                state: { qux: 'bar' },
                state2: { qux: 'bar' },
            });

            store.dispatch({ type: 'SET', payload: 'woo' });
            tester.flush();
            expect(tester.getData()).toEqual({
                state: { qux: 'woo' },
                state2: { qux: 'woo' },
            });

            expect(tester.getRenderCount()).toEqual(2);
            expect(tester.getCallCount()).toEqual(3);

            tester.unmount();
        });
    });
});
