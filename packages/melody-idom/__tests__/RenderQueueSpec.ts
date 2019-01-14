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
    patch,
    patchOuter,
    elementOpen,
    text,
    component,
    elementClose,
    enqueueComponent,
    flush,
    mount,
    link,
    getParent,
    options,
} from '../src';
import { getChildren } from '../src/hierarchy';
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
        elementOpen('div');
        text(this.props.text);
        elementClose('div');
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

describe('renderQueue', () => {
    describe('basic functionality', () => {
        it('should render the component', () => {
            const root = document.createElement('div');
            render(root, SimpleTextComponent, { text: 'Hello World!' });
            expect(root.outerHTML).toEqual('<div>Hello World!</div>');
            render(root, SimpleTextComponent, { text: 'Hello Programm!' });
            expect(root.outerHTML).toEqual('<div>Hello Programm!</div>');
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
                '<div><div>foo</div><div>bar</div></div>'
            );
            render(root, ParentComponent, {
                childs: [{ text: 'bar' }, { text: 'foo' }],
            });
            expect(root.outerHTML).toEqual(
                '<div><div>bar</div><div>foo</div></div>'
            );
        });
    });
    describe('foo', () => {
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

        it('should work', () => {
            const store = createStore(reducer);
            const root = document.createElement('div');
            render(root, SubscribedComponent, { store });
            expect(root.outerHTML).toEqual('<div>foo</div>');
            store.dispatch({ type: 'SET', payload: 'bar' });
            flush();
            expect(root.outerHTML).toEqual('<div>bar</div>');
        });

        it.only('should work 2', () => {
            const rendersA = 0;
            const rendersB = 0;
            class B extends SubscribedComponent {
                render() {
                    rendersB++;
                    elementOpen('div');
                    text(this.state.value + ':' + this.props.value);
                    elementClose('div');
                }
            }
            class A extends SubscribedComponent {
                render() {
                    rendersA++;
                    const { state, props } = this;
                    const { store } = props;
                    elementOpen('div');
                    elementOpen('div');
                    text(state.value);
                    elementClose('div');
                    elementOpen('div');
                    component(SimpleTextComponent, 'b', { text: state.value });
                    component(SimpleTextComponent, 'c', { text: state.value });
                    component(B, 'd', { value: state.value, store });
                    elementClose('div');
                    elementClose('div');
                }
            }

            const store = createStore(reducer);
            const root = document.createElement('div');
            render(root, A, { store });
            expect(root.outerHTML).toEqual(
                '<div><div>foo</div><div><div>foo</div><div>foo</div><div>foo:foo</div></div></div>'
            );
            console.log('UPDATE');
            store.dispatch({ type: 'SET', payload: 'bar' });
            flush();
            expect(root.outerHTML).toEqual(
                '<div><div>bar</div><div><div>bar</div><div>bar</div><div>bar:bar</div></div></div>'
            );
            expect(rendersA).toEqual(2);
            expect(rendersB).toEqual(2);
        });
    });
});
