import { observable, intercept } from 'mobx';

import { findModel } from './model-lookup';
import setupModel from './setup-model';

function onCollectionChangeInterceptor(
    { modelClass, model, defaults: defaultAttributes, inverseOf },
    parentModel, parentModelProp,
) {
    return (change) => {
        if (!change.newValue) {
            change.newValue = {};
        }
        if (!modelClass) {
            modelClass = findModel(model, parentModelProp);
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


export default function createCollection(options, parentModel, parentModelProp) {
    const ary = observable.array([]);
    if (options && options.model) {
        ary.intercept(onCollectionChangeInterceptor(options, parentModel, parentModelProp));
    }
    return ary;
}
