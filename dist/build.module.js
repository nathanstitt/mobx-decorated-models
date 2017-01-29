import { createModelSchema, deserialize, getDefaultModelSchema, identifier, list, object, primitive, serialize, update } from 'serializr';
import { observable } from 'mobx';

var getModelSchema = function (model) {
    if (model.$schema) {
        return model.$schema;
    }
    var schema = observable.shallowMap();
    Object.defineProperty(model, '$schema', {
        enumerable: false,
        writable: false,
        configurable: true,
        value: schema
    });
    return schema;
};

var ModelsMap = new Map();
var PendingLookups = [];

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function findModel(name, options) {
    var modelName = options.className ? options.className : name;
    return ModelsMap[modelName] || ModelsMap[capitalize(modelName)];
}

function addReference(parentModel, propName, options, cb) {
    var model = findModel(propName, options);
    if (model) {
        getDefaultModelSchema(parentModel).props[propName] = cb(model, options);
    } else {
        PendingLookups.push({ parentModel: parentModel, propName: propName, options: options, cb: cb });
    }
}

function readonlyPrimitive() {
    var defaultSerial = primitive();
    return {
        serializer: function serializer() {
            return undefined;
        },
        deserializer: defaultSerial.deserializer
    };
}

var SimpleHandlers = {
    identifier: function identifier$$1() {
        return identifier();
    },
    field: function field() {
        return primitive();
    },
    session: function session() {
        return readonlyPrimitive();
    }
};

var AsyncHandlers = {
    hasMany: function hasMany(model) {
        return list(object(model));
    },
    belongsTo: function belongsTo(model) {
        return object(model);
    }
};

var MixedInInstanceMethods = {
    serialize: function serialize$$1() {
        var schema = getDefaultModelSchema(this.constructor);
        return serialize(schema, this);
    },
    update: function update$$1(json, callback) {
        return update(getDefaultModelSchema(this.constructor), this, json, callback);
    }
};

var MixedInClassMethods = {
    deserialize: function deserialize$$1(json, callback) {
        return deserialize(getDefaultModelSchema(this), json, callback);
    }
};

var classDecorator = function (model) {

    Object.assign(model.prototype, MixedInInstanceMethods);
    Object.assign(model, MixedInClassMethods);

    var schema = getModelSchema(model);

    ModelsMap[model.name] = model;
    var serializeSchema = {};

    schema.forEach(function (_ref, name) {
        var type = _ref.type,
            options = _ref.options;

        if (SimpleHandlers[type]) {
            serializeSchema[name] = SimpleHandlers[type](options, name);
        }
    });

    createModelSchema(model, serializeSchema);

    schema.forEach(function (_ref2, name) {
        var type = _ref2.type,
            options = _ref2.options;

        if (AsyncHandlers[type]) {
            addReference(model, name, options, AsyncHandlers[type]);
        }
    });

    for (var i = PendingLookups.length - 1; i >= 0; i -= 1) {
        var _PendingLookups$i = PendingLookups[i],
            parentModel = _PendingLookups$i.parentModel,
            propName = _PendingLookups$i.propName,
            options = _PendingLookups$i.options,
            cb = _PendingLookups$i.cb;

        var referencedModel = findModel(propName, options);

        if (referencedModel) {
            var parentModelSchema = getDefaultModelSchema(parentModel);
            parentModelSchema.props[propName] = cb(model, options);
            PendingLookups.splice(i, 1);
        }
    }
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};























































var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

function addAttribute(type, target, property, descriptor) {
    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    getModelSchema(target.constructor).set(property, { name: property, type: type, options: options });
    return observable(target, property, descriptor);
}

function buildAttributeDecorator(type, args) {
    var attributeAddFn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : addAttribute;

    if (_typeof(args[0]) === 'object' && args.length === 1) {
        return function (target, property, descriptor) {
            return attributeAddFn(type, target, property, descriptor, args[0]);
        };
    }
    return attributeAddFn.apply(undefined, [type].concat(toConsumableArray(args), [{}]));
}

var identifier$1 = function identifier$$1() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    return buildAttributeDecorator('identifier', args);
};
var field = function field() {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
    }

    return buildAttributeDecorator('field', args);
};
var session = function session() {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
    }

    return buildAttributeDecorator('session', args);
};
var belongsTo = function belongsTo() {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
    }

    return buildAttributeDecorator('belongsTo', args);
};

var hasManyBuilder = function hasManyBuilder(type, target, property, descriptor) {
    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    descriptor.initializer = function () {
        return observable.array([]);
    };
    return addAttribute(type, target, property, descriptor, options);
};
var hasMany = function hasMany() {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
        args[_key5] = arguments[_key5];
    }

    return buildAttributeDecorator('hasMany', args, hasManyBuilder);
};

export { classDecorator as model, identifier$1 as identifier, field, session, belongsTo, hasMany };
//# sourceMappingURL=build.module.js.map
