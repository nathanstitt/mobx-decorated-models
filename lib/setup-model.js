import { markNonserializable } from './serializable'

export default function setupModel({
    attrs, modelClass: Klass, array, defaultAttributes,
    inverseOf, parentModel, parentModelProp,
}) {
    if (!attrs || typeof attrs !== 'object') {
        return attrs;
    }
    if (defaultAttributes) {
        if (typeof defaultAttributes === 'function') {
            defaultAttributes = defaultAttributes.call(parentModel, array, parentModel);
        }
        Object.keys(defaultAttributes).forEach((key) => {
            if (!attrs[key]) {
                attrs[key] = defaultAttributes[key];
            }
        });
    }
    if (inverseOf) {
        if (parentModelProp) {
            attrs[`${inverseOf}_association_name`] = parentModelProp;
        }
        attrs[inverseOf] = parentModel;
    }
    const model = (Klass && !(attrs instanceof Klass)) ? new Klass(attrs) : attrs;
    if (inverseOf) {
        markNonserializable(model, inverseOf);
    }
    return model;
}
