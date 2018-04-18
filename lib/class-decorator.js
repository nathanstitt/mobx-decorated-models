import {
    serialize, deserialize, createModelSchema, primitive, list, object, SKIP,
    identifier, getDefaultModelSchema, update, custom as customSerializer,
} from 'serializr';

import { registerModel, findModel } from './model-lookup';
import {
    isSerializable, markNonserializable,
} from './serializable';

import { getSchema, setupModel, attachInterceptors } from './setup-model';

const PendingLookups = [];

function objectSerializer() {
    return {
        serializer(obj, prop, parent) {
            return isSerializable(parent, prop) ? obj : SKIP;
        },
        deserializer(json, cb) {
            cb(null, json);
        },
    };
}

function addReference(parentModel, propName, options, cb) {
    const model = findModel(options.model, propName);
    if (model) {
        getDefaultModelSchema(parentModel).props[propName] = cb(model, propName, options);
    } else {
        getDefaultModelSchema(parentModel).props[propName] = objectSerializer();
        PendingLookups.push({
            parentModel, propName, options, cb,
        });
    }
}

const dateSerializer = () => customSerializer(
    date => (date ? date.toJSON() : null),
    json => (json ? new Date(json) : null),
);


const CustomSerializerTypes = {
    date:   dateSerializer,
    object: objectSerializer,
    array:  list,
};

function getSerializer(options, defaultSerializer) {
    if (options.serializer) {
        return customSerializer(
            options.serializer[0],
            options.serializer[1],
        );
    }
    const fns = (CustomSerializerTypes[options.type] || defaultSerializer)();
    if (options.writeOnly) {
        return {
            serializer: () => SKIP,
            deserializer: fns.deserializer,
        };
    }
    return fns;
}

const Fields = {
    identifier: options => getSerializer(options, identifier),
    field: options => getSerializer(options, primitive),
    session: options =>
        getSerializer(Object.assign({}, options, { writeOnly: true }), primitive),
};

function associationSerializers(modelClass, propName, options) {
    return {
        serializer: options.serializer ||
            modelClass.serialize ||
            object(getDefaultModelSchema(modelClass)).serializer,
        deserializer: options.deserializer ||
            modelClass.deserializer ||
            (
                (attrs, context) => {
                    let model;
                    // double equals catches null/undefined
                    if (null == attrs) { attrs = {}; }
                    if (attrs instanceof modelClass) {
                        model = attrs;
                    } else {
                        model = setupModel(
                            Object.assign({}, options, { attrs, modelClass }),
                        );
                    }
                    if (options.inverseOf) {
                        markNonserializable(model, options.inverseOf);
                        model[`${options.inverseOf}_association_name`] = propName;
                        model[options.inverseOf] = context.target;
                    }

                    return model;
                }
            ),
    };
}


const Associations = {
    hasMany(modelClass, propName, options) {
        const {
            deserializer,
            serializer,
        } = associationSerializers(modelClass, propName, options);
        options.model = modelClass;
        return Object.assign({ }, options, {
            deserializer(collection, cb, context) {
                const value = collection && collection.map ?
                    collection.map(attrs => deserializer(attrs, context)) : collection;
                cb(null, value);
            },
            serializer(collection, name, parent) {
                if (!isSerializable(parent, name)) { return SKIP; }
                return collection && collection.map ?
                    collection.map(model => serializer(model, name, parent)) : collection;
            },
        });
    },
    belongsTo(modelClass, propName, options) {
        const {
            deserializer,
            serializer,
        } = associationSerializers(modelClass, propName, options);
        options.model = modelClass;
        return Object.assign({}, options, {
            deserializer(attrs, cb, context) {
                cb(null, deserializer(attrs, context));
            },
            serializer(belongsTo, name, parent) {
                if (!isSerializable(parent, name)) { return SKIP; }
                return serializer(belongsTo, name, parent);
            },
        });
    },
};


const MixedInInstanceMethods = {
    serialize() {
        const schema = getDefaultModelSchema(this.constructor);
        return serialize(schema, this);
    },
    update(json, callback) {
        return update(getDefaultModelSchema(this.constructor), this, json, callback);
    },
};

const MixedInClassMethods = {
    deserialize(json, callback) {
        return deserialize(getDefaultModelSchema(this), json, callback);
    },
};

function decorateModel(model) {
    Object.assign(model.prototype, MixedInInstanceMethods);
    Object.assign(model, MixedInClassMethods);

    registerModel(model);
    const serializeSchema = {};
    const { properties } = getSchema(model);
    properties.forEach(({ type, options }, name) => {
        if (Fields[type]) {
            serializeSchema[name] = Fields[type](options, name);
        }
    });

    // eslint-disable-next-line new-cap
    createModelSchema(model, serializeSchema, ({ json }) => new model(json));

    properties.forEach(({ type, options }, name) => {
        if (Associations[type] || options.model) {
            addReference(model, name, options, Associations[type] || Associations.belongsTo);
        }
    });
    for (let i = PendingLookups.length - 1; i >= 0; i -= 1) {
        const { parentModel, propName, options, cb } = PendingLookups[i];
        const referencedModel = findModel(options.model, propName);
        if (referencedModel) {
            const parentModelSchema = getDefaultModelSchema(parentModel);
            parentModelSchema.props[propName] = cb(referencedModel, propName, options);
            PendingLookups.splice(i, 1);
        }
    }
}

export function registerCustomType(id, serializer) {
    CustomSerializerTypes[id] = () => customSerializer(
        serializer.serialize,
        serializer.deserialize,
    );
}

export function identifiedBy(modelId) {
    return (model) => {
        Object.defineProperty(model, 'identifiedBy', { value: modelId, writable: false });
        return decorateModel(model);
    };
}

export function unresolvedAssociations() {
    return PendingLookups.map(({ parentModel: model, propName: property }) => (
        { model, property }
    ));
}
