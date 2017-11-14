import {
    serialize, deserialize, createModelSchema, primitive, list, object, SKIP,
    identifier, getDefaultModelSchema, update, custom as customSerializer,
} from 'serializr';

import { registerModel, findModel } from './model-lookup';
import {
    isSerializable, markNonserializable,
} from './serializable';
import getModelSchema from './schema';
import setupModel from './setup-model';

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
        getDefaultModelSchema(parentModel).props[propName] = cb(model, options, propName);
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

const Associations = {
    hasMany(modelKlass, options) {
        const defaultSerializer = list(object(modelKlass));
        return Object.assign(defaultSerializer, options, {
            model: modelKlass,
        });
    },
    belongsTo(modelKlass, options, propName) {
        const defaultSerializer = object(getDefaultModelSchema(modelKlass));
        const serializerFn = modelKlass.serialize || defaultSerializer.serializer;
        return Object.assign(options, {
            model: modelKlass,
            deserializer(value, cb, context) {
                const setter = (err, model) => {
                    if (!err && options.inverseOf) {
                        markNonserializable(model, options.inverseOf);
                        model[`${options.inverseOf}_association_name`] = propName;
                        model[options.inverseOf] = context.target;
                    }
                    cb(err, model);
                };
                if (value instanceof modelKlass) {
                    setter(null, value);
                } else {
                    setter(null, setupModel(Object.assign(
                        {}, options, { attrs: value, modelClass: modelKlass },
                    )));
                }
            },
            serializer(belongsTo, name, parent) {
                if (!isSerializable(parent, name)) { return SKIP; }
                return serializerFn(belongsTo); // defaultSerializer.serializer(belongsTo);
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

    const schema = getModelSchema(model);
    registerModel(model);
    const serializeSchema = {};
    schema.forEach(({ type, options }, name) => {
        if (Fields[type]) {
            serializeSchema[name] = Fields[type](options, name);
        }
    });
    createModelSchema(model, serializeSchema);
    schema.forEach(({ type, options }, name) => {
        if (Associations[type] || options.model) {
            addReference(model, name, options, Associations[type] || Associations.belongsTo);
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
