import { observable, intercept } from 'mobx';
import createCollection from './collection';
import { getSchema, setupModel, addLazyInitializer, attachInterceptors } from './setup-model';

function onPropertySet(
    change,
    { modelClass, defaultAttributes, inverseOf, parentModel, parentModelProp },
) {
    change.newValue = setupModel({
        attrs: change.newValue,
        modelClass,
        defaultAttributes,
        inverseOf,
        parentModel,
        parentModelProp,
    });
    return change;
}

function onHasManySet(change, options) {
    if (change.type !== 'update' || !change.newValue) { return change; }
    const {
        modelClass, defaultAttributes, inverseOf, parentModel, parentModelProp,
    } = options;

    const array = observable.array([]);
    for (let i = 0; i < change.newValue.length; i += 1) {
        array.push(
            setupModel({
                attrs: change.newValue[i],
                array: change.newValue,
                modelClass,
                defaultAttributes,
                inverseOf,
                parentModel,
                parentModelProp,
            }),
        );
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
    return function() { // eslint-disable-line func-names
        return fn(options, this, propName);
    };
}

function installModelInterceptor(interceptingFn, { target, property }) {
    const { properties } = getSchema(target.constructor);

    addLazyInitializer(target, (model) => {
        const schemaProps = properties.get(property).options;
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
    getSchema(target.constructor).properties.set(property, { name: property, type, options });
    const initializer = getInitializer(type, options, property);
    if (initializer) {
        descriptor.initializer = initializer;
    }
    const definition = observable(target, property, descriptor);
    if ('belongsTo' === type && !options.model) {
        options.model = property;
    }
    if (options.model) {
        installModelInterceptor(setAttributeFn, {
            target, property, descriptor, model: options.model,
        });
    }
    const setter = definition.set;

    definition.set = function(...args) {
        attachInterceptors(this);
        return setter.call(this, ...args);
    };


    return definition;
}

function buildAttributeDecorator(type, args, setAttributeFn) {
    if (('object' === typeof args[0]) && 1 === args.length) {
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
