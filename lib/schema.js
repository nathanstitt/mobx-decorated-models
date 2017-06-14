import { observable } from 'mobx';

export default function (model) {
    if (model.$schema) {
        return model.$schema;
    }
    Object.defineProperty(model, '$schema', {
        enumerable: false,
        writable: false,
        configurable: true,
        value: new Map(),
    });
    return model.$schema;
}
