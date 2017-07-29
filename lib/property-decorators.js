import { observable, intercept } from 'mobx';
import getModelSchema from './schema';
import createCollection from './collection';
import setupModel from './setup-model';

function addLazyInitializer(target, fn) {
    target.__mobxLazyInitializers.push(fn); // eslint-disable-line
}

function onPropertySet(change,
                       { modelClass, defaultAttributes, inverseOf, parentModel, parentModelProp }) {
    change.newValue = setupModel({
        attrs: change.newValue, modelClass, defaultAttributes,
        inverseOf, parentModel, parentModelProp,
    });
    return change;
}

function onHasManySet(change, {
    modelClass, defaultAttributes, inverseOf, parentModel, parentModelProp,
}) {
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
    }
    change.newValue = observable.array(array);
    return change;
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

function installModelInterceptor(interceptingFn, { target, property }) {
    const schema = getModelSchema(target.constructor);
    addLazyInitializer(target, (model) => {
        const schemaProps = schema.get(property).options;
        intercept(model, property, (change => interceptingFn(change, {
            inverseOf:         schemaProps.inverseOf,
            modelClass:        schemaProps.model,
            parentModel:       model,
            parentModelProp:   property,
            defaultAttributes: schemaProps.defaults,
        })));
    });
}

function addAttribute(type, setAttributeFn, target, property, descriptor, options = {}) {
    getModelSchema(target.constructor).set(property, { name: property, type, options });
    const initializer = getInitializer(type, options, property);
    if (initializer) {
        descriptor.initializer = initializer;
    }
    const definition = observable(target, property, descriptor);
    if (type === 'belongsTo' && !options.model) {
        options.model = property;
    }
    if (options.model) {
        installModelInterceptor(setAttributeFn, {
            target, property, descriptor, model: options.model,
        });
    }
    return definition;
}

function buildAttributeDecorator(type, args, setAttributeFn) {
    if ((typeof args[0] === 'object') && args.length === 1) {
        return (target, property, descriptor) =>
            addAttribute(type, setAttributeFn, target, property, descriptor, args[0]);
    }
    return addAttribute(type, setAttributeFn, ...args, {});
}

const hasMany = (...args) => buildAttributeDecorator(
    'hasMany', args, onHasManySet,
);
const belongsTo = (...args) => buildAttributeDecorator(
    'belongsTo', args, onPropertySet,
);
const field = (...args) => buildAttributeDecorator(
    'field', args, onPropertySet,
);
const session = (...args) => buildAttributeDecorator(
    'session', args, onPropertySet,
);
const identifier = (...args) => buildAttributeDecorator(
    'identifier', args, onPropertySet,
);

export { field, session, belongsTo, hasMany, identifier, createCollection };
