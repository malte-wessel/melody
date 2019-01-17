import { flush, elementVoid } from 'melody-idom';
import { render, unmountComponentAtNode } from 'melody-component';
import { createComponent } from '../../src';

const defaultTemplate = {
    render(_context) {
        elementVoid('div');
    },
};

export const createTestComponent = (
    componentFn,
    template = defaultTemplate
) => {
    let callCount = 0;
    let renderCount = 0;

    const finalTemplate = {
        ...template,
        render(_context) {
            renderCount++;
            return template.render(_context);
        },
    };

    const Component = createComponent(props => {
        callCount++;
        return componentFn(props);
    }, finalTemplate);

    const root = document.createElement('div');

    return {
        getData: () => root.__incrementalDOMData.componentInstance.data,
        getNode: () => root,
        getHtml: () => root.outerHTML,
        getCallCount: () => callCount,
        getRenderCount: () => renderCount,
        render: props => render(root, Component, props),
        flush: flush,
        unmount: () => unmountComponentAtNode(root),
    };
};
