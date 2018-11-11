/**
 * Copyright 2018 trivago N.V.
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
import { assert } from 'chai';

import { render } from 'melody-component';
import {
    elementOpen,
    elementClose,
    text,
    component,
    patchOuter,
} from 'melody-idom';
import { createComponent, useEffect, useEffectOnce } from '../src';
import { flush } from './util/flush';

const template = {
    render(_context) {
        elementOpen('div', null, null);
        text(_context.value);
        elementClose('div');
    },
};

describe('component', () => {
    it('should rerender when props have changed', () => {
        const root = document.createElement('div');
        let called = 0;
        const MyComponent = createComponent(template, ({ value }) => {
            called++;
            return { value };
        });
        render(root, MyComponent, { value: 'foo' });
        render(root, MyComponent, { value: 'bar' });
        assert.equal(called, 2);
    });
    it("should not rerender when props haven't changed", () => {
        const root = document.createElement('div');
        let called = 0;
        const MyComponent = createComponent(template, ({ value }) => {
            called++;
            return { value };
        });
        render(root, MyComponent, { value: 'foo' });
        render(root, MyComponent, { value: 'foo' });
        assert.equal(called, 1);
    });
    it('should replace components', function() {
        const template = {
            render(_context) {
                elementOpen('div', 'test', null);
                text(_context.text);
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        const MyComponent = createComponent(template);
        const MyOtherComponent = createComponent(template);

        render(root, MyComponent, { text: 'hello' });
        assert.equal(root.outerHTML, '<div>hello</div>');

        render(root, MyOtherComponent, { text: 'test' });
        assert.equal(root.outerHTML, '<div>test</div>');
    });
    it('should unmount replaced components', function() {
        const template = {
            render(_context) {
                elementOpen('div', 'test', null);
                text(_context.text);
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let unmounted = 0;
        const MyComponent = createComponent(template, ({ text }) => {
            useEffect(() => () => {
                unmounted++;
            });
            return { text };
        });
        const MyOtherComponent = createComponent(template);

        render(root, MyComponent, { text: 'hello' });
        assert.equal(root.outerHTML, '<div>hello</div>');

        render(root, MyOtherComponent, { text: 'test' });
        assert.equal(root.outerHTML, '<div>test</div>');
        assert.equal(unmounted, 1);
    });
    it('should render components into an existing DOM', function() {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(childTemplate, props => {
            useEffectOnce(() => {
                mounted++;
                if (mounted === 3) {
                    throw new Error('gotcha!');
                }
            });
            return props;
        });

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, '3', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(parentTemplate);

        const root = document.createElement('div');
        root.innerHTML = '<div>test</div>';
        assert.equal(root.outerHTML, '<div><div>test</div></div>');
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);
    });
    it('should render components into an existing DOM', function() {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(childTemplate, props => {
            useEffectOnce(() => {
                mounted++;
                if (mounted === 3) {
                    throw new Error('gotcha!');
                }
            });
            return props;
        });

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, '4', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(parentTemplate);

        const root = document.createElement('div');
        root.innerHTML = '<div key="test">test</div>';
        assert.equal(root.outerHTML, '<div><div key="test">test</div></div>');
        const oldChild = root.children[0];
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);
        assert.notEqual(oldChild, root.children[0]);
        assert(
            oldChild.parentNode == null,
            'Previous child no longer has a parent'
        );
    });
    it('should reuse moved child components', function() {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(childTemplate, props => {
            useEffectOnce(() => {
                mounted++;
                if (mounted === 3) {
                    throw new Error('gotcha!');
                }
            });
            return props;
        });

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                if (_context.flip) {
                    component(MyComponent, '2', _context.childProps[1]);
                    component(MyComponent, '1', _context.childProps[0]);
                } else {
                    component(MyComponent, '1', _context.childProps[0]);
                    component(MyComponent, '2', _context.childProps[1]);
                }
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(parentTemplate);

        const root = document.createElement('div');
        render(root, MyParentComponent, {
            childProps: [{ text: 'hello' }, { text: 'world' }],
        });
        const firstCompEl = root.childNodes[0];
        const secondCompEl = root.childNodes[1];
        assert.equal(
            root.outerHTML,
            '<div><div>hello</div><div>world</div></div>'
        );
        assert.equal(mounted, 2);

        render(root, MyParentComponent, {
            flip: true,
            childProps: [{ text: 'hello' }, { text: 'world' }],
        });
        assert.equal(
            root.outerHTML,
            '<div><div>world</div><div>hello</div></div>'
        );
        assert.equal(firstCompEl, root.childNodes[1]);
        assert.equal(secondCompEl, root.childNodes[0]);
        assert.equal(mounted, 2);
    });
    it('should render existing components into an existing DOM', function() {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(childTemplate, props => {
            useEffectOnce(() => {
                mounted++;
            });
            return props;
        });

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, '4', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(parentTemplate);

        const root = document.createElement('div');
        root.innerHTML = '<div key="test">test</div>';
        assert.equal(root.outerHTML, '<div><div key="test">test</div></div>');
        const oldChild = root.children[0];
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);
        assert.notEqual(oldChild, root.children[0]);
        assert(
            oldChild.parentNode == null,
            'Previous child no longer has a parent'
        );
    });
    it('should trigger unmount callback when a Component is removed', function() {
        const template = {
            render(_context) {
                elementOpen('div', null, null);
                elementOpen('p', null, null);
                text(_context.text);
                elementClose('p');
                elementOpen('span');
                text('foo');
                elementClose('span');
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let unmounted = 0;
        const MyComponent = createComponent(template, props => {
            useEffectOnce(() => () => {
                unmounted++;
            });
            return props;
        });

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                component(MyComponent, 'test', { text: 'hello' });
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div><p>hello</p><span>foo</span></div>');
        assert.equal(unmounted, 0);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(unmounted, 1);
    });

    it('should trigger unmount callback when a Component is removed within an element', function() {
        const template = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let unmounted = 0;
        const MyComponent = createComponent(template, props => {
            useEffectOnce(() => () => {
                unmounted++;
            });
            return props;
        });

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                elementOpen('div');
                component(MyComponent, 'test', { text: 'hello' });
                elementClose('div');
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div><div>hello</div></div>');
        assert.equal(unmounted, 0);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(unmounted, 1);
    });
    it('should trigger unmount callback for child components when a Component is removed', function() {
        let MyComponent;
        const template = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                if (_context.comp) {
                    component(MyComponent, 'child', {
                        text: 'world',
                        comp: false,
                    });
                }
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let mounted = 0;
        MyComponent = createComponent(template, props => {
            useEffectOnce(() => {
                mounted++;
                return () => {
                    mounted--;
                };
            });
            return props;
        });

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                component(MyComponent, 'test', { text: 'hello', comp: true });
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div>hello<div>world</div></div>');
        assert.equal(mounted, 2);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(mounted, 0);
    });
    it('should trigger unmount callback for deep nested child components when a Component is removed', function() {
        let mounted = { inner: 0, middle: 0, outer: 0 };
        const root = document.createElement('div');
        const CountInstances = name => props => {
            useEffectOnce(() => {
                mounted[name]++;
                return () => {
                    mounted[name]--;
                };
            });
            return props;
        };

        const InnerComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    elementClose('div');
                },
            },
            CountInstances('inner')
        );

        const MiddleComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    component(InnerComponent, 'child', { inner: true });
                    elementClose('div');
                },
            },
            CountInstances('middle')
        );

        const OuterComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    component(MiddleComponent, 'child', {});
                    elementClose('div');
                },
            },
            CountInstances('outer')
        );

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                component(OuterComponent, 'test', {});
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div><div><div></div></div></div>');
        assert.equal(mounted.inner, 1);
        assert.equal(mounted.middle, 1);
        assert.equal(mounted.outer, 1);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(mounted.inner, 0);
        assert.equal(mounted.middle, 0);
        assert.equal(mounted.outer, 0);
    });
    it('should trigger unmount callback for deep nested child components when a Component is removed', function() {
        let mounted = { innermost: 0, inner: 0, middle: 0, outer: 0 };
        const root = document.createElement('div');
        const CountInstances = name => props => {
            useEffectOnce(() => {
                mounted[name]++;
                return () => {
                    mounted[name]--;
                };
            });
            return props;
        };

        const InnerMostComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    elementClose('div');
                },
            },
            CountInstances('innermost')
        );

        const InnerComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    component(InnerMostComponent, 'child', {});
                    elementClose('div');
                },
            },
            CountInstances('inner')
        );

        const MiddleComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    component(InnerComponent, 'child', {});
                    elementClose('div');
                },
            },
            CountInstances('middle')
        );

        const OuterComponent = createComponent(
            {
                render(_context) {
                    elementOpen('div', null, null);
                    if (_context.comp) {
                        component(MiddleComponent, 'child', {});
                    }
                    elementClose('div');
                },
            },
            CountInstances('outer')
        );

        render(root, OuterComponent, { comp: true });
        assert.equal(root.innerHTML, '<div><div><div></div></div></div>');
        assert.equal(mounted.inner, 1);
        assert.equal(mounted.middle, 1);
        assert.equal(mounted.outer, 1);

        render(root, OuterComponent, { comp: false });
        assert.equal(root.innerHTML, '');
        assert.equal(mounted.inner, 0);
        assert.equal(mounted.middle, 0);
        assert.equal(mounted.outer, 1);
    });

    it('should trigger mount callback once even for nested components', function() {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(childTemplate, props => {
            useEffectOnce(() => {
                mounted++;
            });
            return props;
        });

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, 'MyComponent', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(parentTemplate);

        const root = document.createElement('div');
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);

        render(root, MyParentComponent, { childProps: { text: 'test' } });
        assert.equal(root.outerHTML, '<div><div>test</div></div>');
        assert.equal(mounted, 1);
    });
});
