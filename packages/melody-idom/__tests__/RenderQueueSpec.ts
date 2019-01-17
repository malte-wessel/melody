/**
 * Copyright 2017 trivago N.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    patchOuter,
    elementOpen,
    text,
    component,
    elementClose,
    enqueueComponent,
    flush,
    mount,
} from '../src';

import {
    setQueueRecordsComponentMapper,
    getQueueRecords,
} from '../src/renderQueue';

import { createStore } from 'redux';

class Component {
    constructor() {
        this.el = null;
        this.refs = Object.create(null);
        this.props = null;
    }

    apply(props) {
        this.props = props;
        enqueueComponent(this);
    }

    notify() {}

    componentWillUnmount() {}

    render() {}
}

class SimpleTextComponent extends Component {
    render() {
        elementOpen('span');
        text(this.props.text);
        elementClose('span');
    }
}

const render = (el, Component, props) => {
    patchOuter(
        el,
        () => {
            mount(el, Component, props);
        },
        null
    );
    flush();
};

beforeAll(() => {
    setQueueRecordsComponentMapper(comp => comp.constructor.name);
});
afterAll(() => {
    setQueueRecordsComponentMapper(null);
});

describe('renderQueue', () => {
    describe('basic functionality', () => {
        it('should render the component', () => {
            const root = document.createElement('span');
            render(root, SimpleTextComponent, { text: 'Hello World!' });
            expect(root.outerHTML).toEqual('<span>Hello World!</span>');
            render(root, SimpleTextComponent, { text: 'Hello Programm!' });
            expect(root.outerHTML).toEqual('<span>Hello Programm!</span>');
        });
        it('should render child components', () => {
            class ParentComponent extends Component {
                render() {
                    elementOpen('div');
                    component(SimpleTextComponent, '1', this.props.childs[0]);
                    component(SimpleTextComponent, '2', this.props.childs[1]);
                    elementClose('div');
                }
            }
            const root = document.createElement('div');
            render(root, ParentComponent, {
                childs: [{ text: 'foo' }, { text: 'bar' }],
            });
            expect(root.outerHTML).toEqual(
                '<div><span>foo</span><span>bar</span></div>'
            );
            expect(getQueueRecords()).toEqual([
                'ParentComponent',
                'SimpleTextComponent',
                'SimpleTextComponent',
            ]);
            render(root, ParentComponent, {
                childs: [{ text: 'bar' }, { text: 'foo' }],
            });
            expect(root.outerHTML).toEqual(
                '<div><span>bar</span><span>foo</span></div>'
            );
            expect(getQueueRecords()).toEqual([
                'ParentComponent',
                'SimpleTextComponent',
                'SimpleTextComponent',
            ]);
        });
    });
    describe('multiple components in queue', () => {
        const initialState = {
            value: 'foo',
        };
        const reducer = (state = initialState, action) => {
            if (action.type === 'SET') {
                return {
                    ...state,
                    value: action.payload,
                };
            }
            return state;
        };

        class SubscribedComponent extends Component {
            apply(props) {
                const { store } = props;
                this.state = store.getState();
                this.unsubscribe = store.subscribe(() => {
                    this.state = store.getState();
                    enqueueComponent(this);
                });
                super.apply(props);
            }
            componentWillUnmount() {
                if (this.unsubscribe) this.unsubscribe();
            }
            render() {
                elementOpen('div');
                text(this.state.value);
                elementClose('div');
            }
        }

        it('should work 2', () => {
            const rendersA = 0;
            const rendersB = 0;
            class B extends SubscribedComponent {
                render() {
                    rendersB++;
                    elementOpen('span');
                    text(this.state.value + ':' + this.props.value);
                    elementClose('span');
                }
            }
            class A extends SubscribedComponent {
                render() {
                    rendersA++;
                    const { state, props } = this;
                    const { store } = props;
                    elementOpen('div');
                    component(SimpleTextComponent, 'b', { text: state.value });
                    component(SimpleTextComponent, 'c', { text: state.value });
                    component(B, 'd', { value: state.value, store });
                    elementClose('div');
                }
            }

            const store = createStore(reducer);
            const root = document.createElement('div');
            render(root, A, { store });
            expect(root.outerHTML).toEqual(
                '<div><span>foo</span><span>foo</span><span>foo:foo</span></div>'
            );
            expect(getQueueRecords()).toEqual([
                'A',
                'SimpleTextComponent',
                'SimpleTextComponent',
                'B',
            ]);

            store.dispatch({ type: 'SET', payload: 'bar' });
            flush();
            expect(root.outerHTML).toEqual(
                '<div><span>bar</span><span>bar</span><span>bar:bar</span></div>'
            );
            expect(rendersA).toEqual(2);
            expect(rendersB).toEqual(2);
            expect(getQueueRecords()).toEqual([
                'A',
                'SimpleTextComponent',
                'SimpleTextComponent',
                'B',
            ]);
        });
    });
});
