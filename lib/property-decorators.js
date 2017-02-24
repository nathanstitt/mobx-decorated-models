import {
    observable,
    action,
} from 'mobx';

import { findModel } from './model-lookup';
import getModelSchema from './schema';
import { markNonserializable } from './serializable'
const setupModel = action(function(attrs, modelClass, array, defaultAttributes, inverseOf, parentModel) {
    if (defaultAttributes) {
        if (typeof defaultAttributes === 'function') {
            defaultAttributes = defaultAttributes.call(parentModel, array, parentModel);
        }
        Object.keys(defaultAttributes).forEach((key) => {
            if (!attrs[key]) {
                attrs[key] = defaultAttributes[key];
            }
        });
    }
    if (inverseOf) {
        attrs[inverseOf] = parentModel;
    }
    const model = (modelClass && !(attrs instanceof modelClass)) ? new modelClass(attrs) : attrs;
    markNonserializable(model, inverseOf);
    return model;
});

function buildInterceptor({ modelClass, className, defaults: defaultAttributes, inverseOf }, parentModel) {
    return (change) => {
        if (!change.newValue) {
            change.newValue = {};
        }
        if (!modelClass) {
            modelClass = findModel(className);
        }
        if (change.type === 'splice') {
            for (let i = 0; i < change.added.length; i += 1) {
                change.added[i] = setupModel(change.added[i], modelClass, change.object,
                                             defaultAttributes, inverseOf, parentModel);
            }
        } else if (change.type === 'update') {
            change.newValue = setupModel(change.newValue, modelClass, change.object,
                                         defaultAttributes, inverseOf, parentModel);
        }
        return change;
    };
}


function buildCollection(options, parentModel) {
    const ary = observable.array([]);
    if (options.className || options.modelClass) {
        ary.intercept(buildInterceptor(options, parentModel));
    }
    return ary;
}

const Initializers = {
    object: () => observable.map({}),
    array: buildCollection,
};

const TypeInitializers = {
    hasMany: Initializers.array,
};

function getInitializer(type, options) {
    const fn = TypeInitializers[type] || Initializers[options.type];
    if (!fn) { return undefined; }
    return function () { // eslint-disable-line func-names
        return fn(options, this);
    };
}

function addAttribute(type, target, property, descriptor, options = {}) {
    getModelSchema(target.constructor).set(property, { name: property, type, options });
    const initializer = getInitializer(type, options);
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

const identifier = (...args) => buildAttributeDecorator('identifier', args);
const field = (...args) => buildAttributeDecorator('field', args);
const session = (...args) => buildAttributeDecorator('session', args);
const belongsTo = (...args) => buildAttributeDecorator('belongsTo', args);
const hasManyBuilder = (type, target, property, descriptor, options = {}) =>
      addAttribute(type, target, property, descriptor, options);

const hasMany = (...args) => buildAttributeDecorator('hasMany', args, hasManyBuilder);

export { field, session, belongsTo, hasMany, identifier, buildCollection };
