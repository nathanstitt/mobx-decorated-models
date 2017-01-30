import {
    serialize, deserialize, createModelSchema, primitive, list, object,
    identifier, getDefaultModelSchema, update, map,
} from 'serializr';

import getSchema from './schema';

const ModelsMap = new Map();
const PendingLookups = [];

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function findModel(name, options) {
    const modelName = options.className ? options.className : name;
    return ModelsMap[modelName] || ModelsMap[capitalize(modelName)];
}

function addReference(parentModel, propName, options, cb) {
    const model = findModel(propName, options);
    if (model) {
        getDefaultModelSchema(parentModel).props[propName] = cb(model, options);
    } else {
        PendingLookups.push({ parentModel, propName, options, cb });
    }
}

function readonlyPrimitive(){
    const defaultSerial = primitive();
    return {
        serializer: () => undefined,
        deserializer: defaultSerial.deserializer,
    };
}

function getSerializer(options, defaultSerializer){
    let serializer;
    if (options.type === 'object') {
        serializer = map;
    } else if (options.type === 'array') {
        serializer = list;
    } else {
        serializer = defaultSerializer;
    }
    if (options.writeOnly) {
        return {
            serializer: () => undefined,
            deserializer: serializer.deserializer,
        };
    }
    return serializer();
}

const SimpleHandlers = {
    identifier: options => getSerializer(options, identifier),
    field: options => getSerializer(options, primitive),
    session: options =>
        getSerializer(Object.assign({}, options, { writeOnly: true }), primitive),
};

const AsyncHandlers = {
    hasMany: modelRef => list(object(modelRef)),
    belongsTo: (model, opt) => {
        return object(getDefaultModelSchema(model))
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

export default function (model) {
    Object.assign(model.prototype, MixedInInstanceMethods);
    Object.assign(model, MixedInClassMethods);

    const schema = getSchema(model);

    ModelsMap[model.name] = model;
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
