import { observable, intercept } from 'mobx';
import { getDefaultModelSchema } from 'serializr';

import getModelSchema from './schema';

function addLazyInitializer(target, fn) {
    target.__mobxLazyInitializers.push(fn);
}
import createCollection from './collection';

import setupModel from './setup-model';

function onBelongsToSet(change,
                        { modelClass, defaultAttributes, inverseOf,
                          parentModel, parentModelProp }) {
    change.newValue = setupModel({
        attrs: change.newValue, modelClass,
        defaultAttributes, inverseOf, parentModel, parentModelProp,
    });
    return change;
}

function onHasManySet(change,
                      { modelClass, defaultAttributes, inverseOf,
                        parentModel, parentModelProp }) {
    if (change.type !== 'update' || !change.newValue) { return change; }
    const { newValue: array } = change;

    for (let i = 0; i < array.length; i += 1) {
        array[i] = setupModel({
            attrs: array[i], array, modelClass,
            defaultAttributes, inverseOf, parentModel, parentModelProp,
        });
    }

    if (parentModel[parentModelProp]) {
        parentModel[parentModelProp].replace(array);
        return null;
    } else {
        change.newValue = observable.array(array);
        return change;
    }
}


const Initializers = {
    object: () => observable.object({}),
    array: createCollection,
};

const TypeInitializers = {
    hasMany: createCollection,
};

function getInitializer(type, options, propName) {
    const fn = TypeInitializers[type] || Initializers[options.type];
    if (!fn) { return undefined; }
    return function () { // eslint-disable-line func-names
        return fn(options, this, propName);
    };
}

function addAttribute(type, target, property, descriptor, options = {}) {
    getModelSchema(target.constructor).set(property, { name: property, type, options });
    const initializer = getInitializer(type, options, property);
    if (initializer) {
        descriptor.initializer = initializer;
    }
    const definition = observable(target, property, descriptor);
    return definition;
}

function buildAttributeDecorator(type, args, attributeAddFn = addAttribute) {
    if ((typeof args[0] === 'object') && args.length === 1) {
        return (target, property, descriptor) =>
            attributeAddFn(type, target, property, descriptor, args[0]);
    }
    return attributeAddFn(type, ...args, {});
}

function interceptingDecorator(interceptingFn) {
    return (type, target, property, descriptor, options = {}) => {
        const decorator = addAttribute(type, target, property, descriptor, options);
        addLazyInitializer(target, (model) => {
            const schema = getDefaultModelSchema(target);
            if (schema && schema.props[property]) {
                const schemaProps = schema.props[property];
                intercept(model, property, (change => interceptingFn(change, {
                    inverseOf:         schemaProps.inverseOf,
                    modelClass:        schemaProps.model,
                    parentModel:       model,
                    parentModelProp:   property,
                    defaultAttributes: schemaProps.defaults,
                })));
            }
        });
        return decorator;
    };
}


const hasMany = (...args) => buildAttributeDecorator(
    'hasMany', args, interceptingDecorator(onHasManySet),
);

const belongsTo = (...args) => buildAttributeDecorator(
    'belongsTo', args, interceptingDecorator(onBelongsToSet),
);

const identifier = (...args) => buildAttributeDecorator('identifier', args);
const field = (...args) => buildAttributeDecorator('field', args);
const session = (...args) => buildAttributeDecorator('session', args);

export { field, session, belongsTo, hasMany, identifier, createCollection };
