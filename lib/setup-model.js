import { markNonserializable } from './serializable';

export default function setupModel({
    attrs, modelClass: Klass, array, defaultAttributes,
    inverseOf, parentModel, parentModelProp,
}) {
    if (!attrs) { return attrs; }
    const isObject = (typeof attrs === 'object');
    const canWrite = Object.isExtensible(attrs);

    if (isObject && canWrite) {
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
            attrs[inverseOf] = parentModel;
            if (parentModelProp) {
                attrs[`${inverseOf}_association_name`] = parentModelProp;
            }
        }
    }

    const model = (Klass && typeof Klass === 'function' && !(attrs instanceof Klass)) ?
                  new Klass(attrs) : attrs;

    if (inverseOf) {
        markNonserializable(model, inverseOf);
    }

    return model;
}
