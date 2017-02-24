export function isSerializable(model, property) {
    return !!(!model.$nonSerializable || -1 === model.$nonSerializable.indexOf(property));
}

export function markNonserializable(model, property) {
    model.$nonSerializable = model.$nonSerializable || [];
    model.$nonSerializable.push(property);
}
