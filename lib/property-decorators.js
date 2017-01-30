import {
    observable,
} from 'mobx';

import getModelSchema from './schema';

const Initializers = {
    object: () => observable.map({}),
    array:  () => observable.array([]),
};

const TypeInitializers = {
    hasMany: Initializers.array,
};

function getInitializer(type, options) {
    return TypeInitializers[type] || Initializers[options.type];
}


function addAttribute(type, target, property, descriptor, options = {}) {
    getModelSchema(target.constructor).set(property, { name: property, type, options });
    const initializer = getInitializer(type, options);
    if (initializer) {
        descriptor.initializer = initializer;
    }
    return observable(target, property, descriptor);
}

function buildAttributeDecorator(type, args, attributeAddFn = addAttribute) {
    if ((typeof args[0] === 'object') && args.length === 1) {
        return (target, property, descriptor) =>
            attributeAddFn(type, target, property, descriptor, args[0]);
    }
    return attributeAddFn(type, ...args, {});
}

const identifier = (...args) =>  buildAttributeDecorator('identifier', args);
const field = (...args) => buildAttributeDecorator('field', args);
const session = (...args) => buildAttributeDecorator('session', args);
const belongsTo = (...args) => buildAttributeDecorator('belongsTo', args);

const hasManyBuilder = (type, target, property, descriptor, options = {}) =>
      addAttribute(type, target, property, descriptor, options);

const hasMany = (...args) => buildAttributeDecorator('hasMany', args, hasManyBuilder);


export { field, session, belongsTo, hasMany, identifier };
