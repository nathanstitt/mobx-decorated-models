export function isSerializable(model, property) {
    return !!(!model.$nonSerializable || !model.$nonSerializable[property]);
}

export function markNonserializable(model, property) {
    model.$nonSerializable = model.$nonSerializable || {};
    model.$nonSerializable[property] = true;
}
