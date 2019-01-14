/**
 * Copyright 2015 The Incremental DOM Authors.
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
import { patchOuter, updateComponent, RenderableComponent } from './core';
import { getDepth } from './hierarchy';

export const mountedComponents = new WeakSet<RenderableComponent>();

const queue: RenderableComponent[] = [];

function addToQueue(component: RenderableComponent) {
    if (queue.includes(component)) return;
    queue.push(component);
}

export function clear() {
    queue.length = 0;
}

export function drop(component: RenderableComponent) {
    const index = queue.indexOf(component);
    if (index > -1) {
        queue.splice(index, 1);
    }
}

let isTicking = false;
function tick(callback: () => void) {
    if (isTicking) return;
    isTicking = true;
    requestAnimationFrame(() => {
        callback();
        isTicking = false;
    });
}

export function flush() {
    queue.sort((a, b) => getDepth(a) - getDepth(b));

    let next: RenderableComponent;
    const notify: RenderableComponent[] = [];
    while ((next = queue.shift())) {
        if (next.el) {
            patchOuter(next.el, _ => updateComponent(next), {});
            notify.push(next);
        }
    }
    for (let i = 0, l = notify.length; i < l; i++) {
        const component = notify[i];
        if (component.el) {
            mountedComponents.add(component);
            component.notify();
        }
    }
}

export function enqueueComponent(component: RenderableComponent) {
    addToQueue(component);
    /* istanbul ignore else */
    if (process.env.NODE_ENV === 'test') {
        return;
    }
    tick(flush);
}
