const ModelsMap = new Map();

function defaultModelLookup({ property, model = property }) {
    if (typeof model === 'function') { return model; }
    return ModelsMap[model] || ModelsMap[property];
}
let modelLookup = defaultModelLookup;

const defaultRememberModel = (model) => {
    ModelsMap[model.identifiedBy || model.name] = model;
};
let rememberModel = defaultRememberModel;

export function registerModel(model) {
    rememberModel(model);
}

export function findModel(model, property) {
    return modelLookup({ model, property });
}

export function rememberModelUsing(fn) {
    rememberModel = fn || defaultRememberModel;
}

export function lookupModelUsing(fn) {
    modelLookup = fn || defaultModelLookup;
}
