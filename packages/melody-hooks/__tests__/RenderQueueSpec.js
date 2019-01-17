import { render } from 'melody-component';
import { createComponent } from '../src';
import {
    elementOpen,
    elementClose,
    text,
    component,
    flush,
    setQueueRecordsComponentMapper,
    getQueueRecords,
} from 'melody-idom';
import { useStore } from '../src';
import { createMockStore } from './util/createMockStore';

setQueueRecordsComponentMapper(c => c.data.id);

const store = createMockStore({
    foo: 'foo',
    bar: 'bar',
});

const selector = state => ({
    value: state.foo + state.bar,
});

const createTreeTester = () => {
    let callsById = {};
    let callsOrder = [];
    let rendersById = {};
    let rendersOrder = [];

    const clear = () => {
        callsById = {};
        callsOrder = [];
        rendersById = {};
        rendersOrder = [];
    };

    const createSubscribedComponent = (id, children = []) =>
        createComponent(
            () => {
                callsById[id] = (callsById[id] || 0) + 1;
                callsOrder.push(id);
                const state = useStore(store, selector);
                return {
                    value: state.value,
                    id: id,
                };
            },
            {
                render(_context) {
                    rendersById[id] = (rendersById[id] || 0) + 1;
                    rendersOrder.push(id);
                    elementOpen('div');
                    for (let i = 0, l = children.length; i < l; i++) {
                        const ChildComponent = children[i];
                        component(ChildComponent, id + '-' + i, {
                            value: _context.value,
                        });
                    }
                    elementClose('div');
                },
            }
        );

    const createStaticComponent = (id, children = []) =>
        createComponent(
            () => {
                callsById[id] = (callsById[id] || 0) + 1;
                callsOrder.push(id);
                return {
                    id,
                    value: 'static',
                };
            },
            {
                render(_context) {
                    rendersById[id] = (rendersById[id] || 0) + 1;
                    rendersOrder.push(id);
                    elementOpen('div');
                    for (let i = 0, l = children.length; i < l; i++) {
                        const ChildComponent = children[i];
                        component(ChildComponent, id + '-' + i, {
                            value: _context.value,
                        });
                    }
                    elementClose('div');
                },
            }
        );
    return {
        createStaticComponent,
        createSubscribedComponent,
        clear,
        getCallsById: () => callsById,
        getCallsOrder: () => callsOrder,
        getRendersById: () => rendersById,
        getRendersOrder: () => rendersOrder,
    };
};

describe('renderQueue', () => {
    it('renders in the correct order', () => {
        const {
            createSubscribedComponent,
            createStaticComponent,
            clear,
            getCallsById,
            getCallsOrder,
            getRendersById,
            getRendersOrder,
        } = createTreeTester();

        const Tree = createSubscribedComponent('0', [
            createStaticComponent('0-1', [
                createStaticComponent('0-1-1'),
                createStaticComponent('0-1-2'),
            ]),
            createStaticComponent('0-2', [
                createSubscribedComponent('0-2-1'),
                createSubscribedComponent('0-2-2'),
                createStaticComponent('0-2-3', [
                    createSubscribedComponent('0-2-3-1'),
                ]),
            ]),
            createSubscribedComponent('0-3'),
            createSubscribedComponent('0-4', [
                createSubscribedComponent('0-4-1'),
                createSubscribedComponent('0-4-2'),
            ]),
        ]);

        const root = document.createElement('div');
        render(root, Tree);
        // console.log('queue', getQueueRecords());
        // console.log('renders', getRendersById());

        console.log('UPDATE');
        clear();
        store.dispatch({ type: 'SET', payload: 'woo' });
        flush();
        console.log('queue', getQueueRecords());
        console.log('rendersById', getRendersById());
        console.log('renders', getRendersOrder());
        console.log('calls', getCallsOrder());
        console.log('callsById', getCallsById());
    });
});
