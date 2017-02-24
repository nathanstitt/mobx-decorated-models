import {
    observable,
    action,
} from 'mobx';

import { findModel } from './model-lookup';
import getModelSchema from './schema';
import { markNonserializable } from './serializable'
const setupModel = action(function({
    attrs, modelClass: Klass, array, defaultAttributes, inverseOf, parentModel, parentModelProp,
}) {
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
        if (parentModelProp) {
            attrs[`${inverseOf}_association_name`] = parentModelProp;
        }
        attrs[inverseOf] = parentModel;
    }
    const model = (Klass && !(attrs instanceof Klass)) ? new Klass(attrs) : attrs;
    markNonserializable(model, inverseOf);
    return model;
});

function buildInterceptor(
    { modelClass, className, defaults: defaultAttributes, inverseOf },
    parentModel, parentModelProp)
{
    return (change) => {
        if (!change.newValue) {
            change.newValue = {};
        }
        if (!modelClass) {
            modelClass = findModel(className);
        }
        if (change.type === 'splice') {
            for (let i = 0; i < change.added.length; i += 1) {
                change.added[i] = setupModel({
                    attrs: change.added[i], array: change.object, modelClass,
                    defaultAttributes, inverseOf, parentModel, parentModelProp });
            }
        } else if (change.type === 'update') {
            change.newValue = setupModel({
                attrs: change.newValue, array: change.object, modelClass,
                defaultAttributes, inverseOf, parentModel, parentModelProp });
        }
        return change;
    };
}


function buildCollection(options, parentModel, parentModelProp) {
    const ary = observable.array([]);
    if (options.className || options.modelClass) {
        ary.intercept(buildInterceptor(options, parentModel, parentModelProp));
    }
    return ary;
}

const Initializers = {
    object: () => observable.map({}),
    array: buildCollection,
};

const TypeInitializers = {
    hasMany: buildCollection,
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

const identifier = (...args) => buildAttributeDecorator('identifier', args);
const field = (...args) => buildAttributeDecorator('field', args);
const session = (...args) => buildAttributeDecorator('session', args);
const belongsTo = (...args) => buildAttributeDecorator('belongsTo', args);
const hasManyBuilder = (type, target, property, descriptor, options = {}) =>
      addAttribute(type, target, property, descriptor, options);

const hasMany = (...args) => buildAttributeDecorator('hasMany', args, hasManyBuilder);

export { field, session, belongsTo, hasMany, identifier, buildCollection };
