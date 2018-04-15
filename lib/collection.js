import { observable } from 'mobx';

import { findModel } from './model-lookup';
import { setupModel } from './setup-model';

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
        // console.log("ARY CHANGE");
        if (change.type === 'splice') {
            for (let i = 0; i < change.added.length; i += 1) {
                change.added[i] = setupModel({
                    attrs: change.added[i],
                    array: change.object,
                    modelClass,
                    defaultAttributes,
                    inverseOf,
                    parentModel,
                    parentModelProp });
            }
        } else if (change.type === 'update') {
            change.newValue = setupModel({
                attrs: change.newValue,
                array: change.object,
                modelClass,
                defaultAttributes,
                inverseOf,
                parentModel,
                parentModelProp });
        }
        return change;
    };
}


export default function createCollection(options, parentModel, parentModelProp) {
    const ary = observable.array([]);
    //console.log("CREATE COL", parentModelProp);
    if (options) {
        if (options.model) {
            ary.intercept(onCollectionChangeInterceptor(options, parentModel, parentModelProp));
        }
        if (options.extend) {
            if ('function' === typeof options.extend){
                options.extend(ary);
            } else {
                Object.assign(ary, options.extend);
            }
        }
    }

    return ary;
}
