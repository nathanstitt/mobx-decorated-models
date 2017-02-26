const ModelsMap = new Map();

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const defaultModelLookup = (propertyName, options = {}) => {
    const modelName = options.classId || propertyName;
    return ModelsMap[modelName] || ModelsMap[capitalize(modelName)];
};
let modelLookup = defaultModelLookup;

const defaultRememberModel = (model) => {
    ModelsMap[model.identifiedBy || model.name] = model;
};
let rememberModel = defaultRememberModel;

export function registerModel(model) {
    rememberModel(model);
}

export function findModel(propertyName, options) {
    return modelLookup(propertyName, options);
}

export function rememberModelUsing(fn) {
    rememberModel = fn || defaultRememberModel;
}

export function lookupModelUsing(fn) {
    modelLookup = fn || defaultModelLookup;
}
