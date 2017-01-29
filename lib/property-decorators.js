import {
    observable,
} from 'mobx';

import getModelSchema from './schema';

function addAttribute(type, target, property, descriptor, options = {}) {
    getModelSchema(target.constructor).set(property, { name: property, type, options });
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

const hasManyBuilder = (type, target, property, descriptor, options = {}) => {
    descriptor.initializer = () => observable.array([]);
    return addAttribute(type, target, property, descriptor, options);
};
const hasMany = (...args) => buildAttributeDecorator('hasMany', args, hasManyBuilder);


export { field, session, belongsTo, hasMany, identifier };
