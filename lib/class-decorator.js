import {
    serialize, deserialize, createModelSchema, primitive, list, object,
    identifier, getDefaultModelSchema, update,
} from 'serializr';

import { registerModel, findModel } from './model-lookup';
import { isSerializable, markNonserializable } from './serializable';
import getSchema from './schema';

const PendingLookups = [];

function objectSerializer() {
    return {
        serializer(obj, prop, parent) {
            return isSerializable(parent, prop) ? obj : undefined;
        },
        deserializer(json, cb) {
            cb(null, json);
        },
    };
}

function addReference(parentModel, propName, options, cb) {
    const model = findModel(options.model, propName);
    if (model) {
        getDefaultModelSchema(parentModel).props[propName] = cb(model, options, propName);
    } else {
        getDefaultModelSchema(parentModel).props[propName] = objectSerializer();
        PendingLookups.push({ parentModel, propName, options, cb });
    }
}

function getSerializer(options, defaultSerializer) {
    let serializer;
    if (options.type === 'object') {
        serializer = objectSerializer;
    } else if (options.type === 'array') {
        serializer = list;
    } else {
        serializer = defaultSerializer;
    }
    const fns = serializer();
    if (options.writeOnly) {
        return {
            serializer: () => undefined,
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

const Associations = {
    hasMany(modelKlass, options) {
        const defaultSerializer = list(object(modelKlass));
        return Object.assign(defaultSerializer, options, {
            model: modelKlass,
        });
    },
    belongsTo(modelKlass, options, propName) {
        const defaultSerializer = object(getDefaultModelSchema(modelKlass));
        return Object.assign(options, {
            model: modelKlass,
            deserializer(value, cb, context) {
                defaultSerializer.deserializer(value, (err, model) => {
                    if (!err && options.inverseOf) {
                        markNonserializable(model, options.inverseOf);
                        model[`${options.inverseOf}_association_name`] = propName;
                        model[options.inverseOf] = context.target;
                    }
                    cb(err, model);
                });
            },
            serializer(belongsTo, name, parent) {
                if (!isSerializable(parent, name)) { return undefined; }
                return defaultSerializer.serializer(belongsTo);
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

    const schema = getSchema(model);
    registerModel(model);
    const serializeSchema = {};
    schema.forEach(({ type, options }, name) => {
        if (Fields[type]) {
            serializeSchema[name] = Fields[type](options, name);
        }
    });
    createModelSchema(model, serializeSchema);
    schema.forEach(({ type, options }, name) => {
        if (Associations[type]) {
            addReference(model, name, options, Associations[type]);
        }
    });
    for (let i = PendingLookups.length - 1; i >= 0; i -= 1) {
        const { parentModel, propName, options, cb } = PendingLookups[i];
        const referencedModel = findModel(options.model, propName);
        if (referencedModel) {
            const parentModelSchema = getDefaultModelSchema(parentModel);
            parentModelSchema.props[propName] = cb(referencedModel, options, propName);
            PendingLookups.splice(i, 1);
        }
    }
}

export function modelDecorator(modelOrIdentifier) {
    if (typeof modelOrIdentifier === 'function') {
        modelOrIdentifier.identifiedBy = modelOrIdentifier.name;
        return decorateModel(modelOrIdentifier);
    }
    return (model) => {
        model.identifiedBy = modelOrIdentifier;
        return decorateModel(model);
    };
}

export function unresolvedAssociations() {
    return PendingLookups.map(({ parentModel: model, propName: property }) => (
        { model, property }
    ));
}
