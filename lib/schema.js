import { observable } from 'mobx';

export default function (model) {
    if (model.$schema) {
        return model.$schema;
    }
    const schema = observable.shallowMap();
    Object.defineProperty(model, '$schema', {
        enumerable: false,
        writable: false,
        configurable: true,
        value: schema,
    });
    return schema;
}
