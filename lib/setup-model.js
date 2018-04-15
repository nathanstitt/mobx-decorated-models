import { markNonserializable } from './serializable';

function hasInterceptors(model) {
    return Boolean(model.constructor.$mxdm && model.constructor.$mxdm.interceptors.length);
}

export function getSchema(klass) {
    if (klass.$mxdm) { return klass.$mxdm; }

    Object.defineProperty(klass, '$mxdm', {
        enumerable: false,
        writable: false,
        configurable: true,
        value: Object.freeze({
            interceptors: [],
            properties: new Map(),
        }),
    });
    return klass.$mxdm;
}

export function addLazyInitializer(target, fn) {
    const { interceptors } = getSchema(target.constructor);
    interceptors.push(fn);
}

export function attachInterceptors(model) {
    if (!hasInterceptors(model) || model.$mxdbDidAttachInterceptors) { return; }
    Object.defineProperty(model, '$mxdbDidAttachInterceptors', {
        enumerable: false, writable: false, configurable: true, value: true,
    });
    getSchema(model.constructor).interceptors.forEach(fn => fn(model));
}

export function setupModel({
    attrs, modelClass: Klass, array, defaultAttributes,
    inverseOf, parentModel, parentModelProp,
}) {
    if (!attrs) { return attrs; }
    const isObject = ('object' === typeof attrs);
    const canWrite = Object.isExtensible(attrs);

    if (isObject && canWrite) {
        if (defaultAttributes) {
            if ('function' === typeof defaultAttributes) {
                defaultAttributes = defaultAttributes.call(parentModel, array, parentModel);
            }
            Object.keys(defaultAttributes).forEach((key) => {
                if (!attrs[key]) {
                    attrs[key] = defaultAttributes[key];
                }
            });
        }

        if (inverseOf) {
            attrs[inverseOf] = parentModel;
            if (parentModelProp) {
                attrs[`${inverseOf}_association_name`] = parentModelProp;
            }
        }
    }

    const model = (Klass && 'function' === typeof Klass && !(attrs instanceof Klass)) ?
        new Klass(attrs) : attrs;

    if (inverseOf) {
        markNonserializable(model, inverseOf);
    }

    return model;
}
