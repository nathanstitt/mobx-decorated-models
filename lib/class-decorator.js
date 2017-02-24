import {
    serialize, deserialize, createModelSchema, primitive, list, object,
    identifier, getDefaultModelSchema, update,
} from 'serializr';
import {
    observable,
} from 'mobx';

import { registerModel, findModel } from './model-lookup';
import { isSerializable, markNonserializable } from './serializable'
import getSchema from './schema';

const PendingLookups = [];

function addReference(parentModel, propName, options, cb) {
    const model = findModel(propName, options);
    if (model) {
        getDefaultModelSchema(parentModel).props[propName] = cb(model, options);
    } else {
        PendingLookups.push({ parentModel, propName, options, cb });
    }
}

function objectSerializer() {
    return {
        serializer(obj) { return obj.toJS(); },
        deserializer(json, cb) { cb(null, observable.map(json)); },
    };
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

const SimpleHandlers = {
    identifier: options => getSerializer(options, identifier),
    field: options => getSerializer(options, primitive),
    session: options =>
        getSerializer(Object.assign({}, options, { writeOnly: true }), primitive),
};

const AsyncHandlers = {
    hasMany: modelRef => list(object(modelRef)),
    belongsTo: (modelKlass, options) => {
        const defaultSerializer = object(getDefaultModelSchema(modelKlass));
        return {
            deserializer(value, cb, context) {
                defaultSerializer.deserializer(value, (err, model) => {
                    if (!err && options.inverseOf) {
                        markNonserializable(model, options.inverseOf);
                        model[options.inverseOf] = context.target;
                    }
                    cb(err, model);
                });
            },
            serializer(belongsTo, name, parent) {
                if (!isSerializable(parent, name)) { return undefined; }
                return defaultSerializer.serializer(belongsTo);
            },
        };
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

export function modelDecorator(model) {
    Object.assign(model.prototype, MixedInInstanceMethods);
    Object.assign(model, MixedInClassMethods);

    const schema = getSchema(model);

    registerModel(model);

    const serializeSchema = {};

    schema.forEach(({ type, options }, name) => {
        if (SimpleHandlers[type]) {
            serializeSchema[name] = SimpleHandlers[type](options, name);
        }
    });

    createModelSchema(model, serializeSchema);

    schema.forEach(({ type, options }, name) => {
        if (AsyncHandlers[type]) {
            addReference(model, name, options, AsyncHandlers[type]);
        }
    });

    for (let i = PendingLookups.length - 1; i >= 0; i -= 1) {
        const { parentModel, propName, options, cb } = PendingLookups[i];
        const referencedModel = findModel(propName, options);

        if (referencedModel) {
            const parentModelSchema = getDefaultModelSchema(parentModel);
            parentModelSchema.props[propName] = cb(referencedModel, options);
            PendingLookups.splice(i, 1);
        }
    }
}
