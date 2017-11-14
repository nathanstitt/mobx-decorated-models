# Decorators for creating model relationships with mobx

mobx-decorated-models is a collection of Javascript decorators to make a classes and their relationships observable and serializable.

[![Build Status](https://travis-ci.org/nathanstitt/mobx-decorated-models.svg?branch=master)](https://travis-ci.org/nathanstitt/mobx-decorated-models)

## Introduction

This library is a collection of decorators that co-ordinates making
models relate to each other and their fields both observable and serializable.

It's built on top of two awesome libraries:

[Mobx](https://mobx.js.org) makes state management super simple, but it doesn't offer an opinion on how to get data in and out of the observed data structures.

[Serializr](https://github.com/mobxjs/serializr) takes care of that nicely.

Combining the two libraries isn’t difficult, but then you end up specifing each attribute twice; once so Mobx will observe it, and once to create a schema for Serializr.  Enter mobx-decorated-models.


## Example

```javascript
import { model, field, session, belongsTo, hasMany, identifier } from 'mobx-decorated-models';

@identifiedBy('box')
export class Box {
    @identifier id;
    @field width  = 0;
    @field height = 0;
    @field depth  = 0;
    @session tmpContents = 'a bunch of things'

    @computed get volume() {
        return this.width * this.height * this.depth;
    }

    @hasMany items;
    @belongsTo container;
    @belongsTo({ model: 'address' }) warehouse;
}
```

additional examples used for testing are located in `specs/test-models.js`

```javascript
boxes = @observable.array([])
fetch('/my/api/endpoints/boxes/1.json').then(function(response) {
  boxes.concat(Box.deserialize(response.json()));
});

const box = Box.deserialize({ id: 1, width: 2, height: 3, depth: 8 }); // returns an instance of Box
console.log(box.volume);      // => 48
console.log(box.serialize()); // => { id: 1, width: 2, height: 3, depth: 8, items: [] };  note `tmpContents` isn't serialized
```

## Controlling model lookups

The class `@identifiedBy` accepts a unique string that should be used  as a lookup key so
that `hasMany` and `belongsTo` relationships can be established.

This allows things like the below mappings to still work even though the two files can't easily include each other:


```javascript
// chair.js

import { identifiedBy, belongsTo } from 'mobx-decorated-models';

@identifiedBy('chair')
class Chair {
    belongsTo 'table'
}


// table.js
import { identifiedBy, hasMany } from 'mobx-decorated-models';

@identifiedBy('table')
class Table {
    hasMany({ model: 'chair' }) 'seats'
}
```

## Collections

The same logic that is used for hasMany can also build a stand-alone collection.  Collections built this way are instances of mobx `observable.array` with an interceptor that converts assigment into model creation.

A collecton can be created like so:

```javascript
import { createCollection } from 'mobx-decorated-models';

class Foo {
    constructor(attrs) { Object.assign(this, attrs); }
    myName() { return this.name; }
}

const collection = createCollection({ model: Foo });
collection.push({ name: 'bar' });
collection[0].myName(); // will return "bar", since it's coerced into an instance of Foo
```

Note that the "model" objects a collection is set to do not have to be decorated by the `@identifiedBy` decorator if they're given directly as shown in the exmple above.  However if they were, then the identifier could be given to 'model' instead of the class.

## Decorators

### identifiedBy('identifier')

Marks a class as serializable.

It adds a few convenience methods to classes:

 * static `deserialize` method.  Used to turn JSON structure into a model (or collection of models)
 * a read-only static `identifiedBy` value that matches the string provided to the decorator
 * an `update` method.  Updates a model's attributes and child associations.
 * `serialize`.  Converts the model's attributes and it's associations to JSON.

It’s primary purpose is to remember classes for hasMany/belongsTo lookups.  This allows the associations to refer to models without having to load them.  Often models will refer to one another, making it difficult for each of them obtain a direct reference.

### identifier

The primary key for the model

### field

marks a class property as observable and serializable.

The type of field can be set to `array` or `object`, or `date` by specifying options.  For other types, a `model` option can be given or a custom serialization type used.

*example:*
@identifiedBy('bar')
class Bar {
  static serialize(bar) {
    return bar ? 'BAR' : null;
  }
}

```javascript
@identifiedBy('foo')
class Foo {
  @field({ type: 'object' }) options; // will default to an observable map
  @field({ type: 'array'  }) tags;    // defaults to []
  @field({ type: 'date'   }) occured; // no default value is set
  @field({ model: 'bar'   }) bar;
}

const foo = new Foo();
foo.update({ occured: '2013-10-21T13:28:06.419Z', bar: '123' }); // bar doesn't actually store anything
console.log(foo.occured); // Mon Oct 21 2013 08:28:06 GMT-0500 (CDT), provided you're in CDT :)
foo.tags.push('one');
foo.options.set('one', 1);
foo.serialize(); // => { tags: ['one'], options: { one: 1 }, occured: '2013-10-21T13:28:06.419Z', bar: 'BAR' }
```


### session

Session fields are useful for storing data that should not be persisted.

They're write-only, meaning they're updated by the `deserialize` static method and `update()` instance method, but are not included in the JSON generated by `serialize()`


*example:*

```javascript
@identifiedBy('user')
class User {
    @field id;
    @session isLoggedIn;
}

const user = new User();
user.update({ id: 1234, isLoggedIn: true });
user.serialize(); // => { id: 1234 }; // note the "isLoggedIn" property is ommited
```

### belongsTo

Makes a property as referring to another model.  Will map to
the referenced class based on it's identifiedBy and the property name, i.e. a property named `box` will
look for a class identified by `box`.

Optionally can be given an option object with a `model` property to control the mapping.

`model` can be either a string which matches a value given to the identifiedBy decorator, or a reference to the model itself.

*example:*

```javascript
@identifiedBy('person')
class Person({
    @identifier id;
    @field name;
    // finds a model that was set to use the id `pants` by it's decorator
    @belongsTo({ model: 'pants', inverseOf: 'owner' }) outfit;
    speak(msg) {
        console.log(`${this.name} says: ${msg}`);
    }
})

@identifiedBy('pants')
class Pants {
  @session color;
  @belongsTo({ model: Person }) owner; // no lookup, will just use the class `Person`
}
```

Can be given a `inverseOf` which will set auto set this property to it's parent when it's deserialized.

For instance the Pants model above will have it's owner property set to the "Ralph" Person model:

```javascript
Person.deserialize({
    id: 1, name: 'Ralph', outfit: { color: 'RED' }
})
```

An interceptor is installed that will convert bare objects to a model.  In the example below, the owner will be set to an instance of Person

```javascript
const pants = new Pants();
pants.owner = { id: 1, name: 'Jimmy' };

pants.owner.speak("Hello World!"); // Jimmy says: Hello World
```


**Note**: When using `inverseOf`, the auto-set property is not serialized in order to prevent circular references.

### hasMany

Marks a property as belonging to an mobx observable array of models.

Sets the default value to an empty observable array

As in `belongsTo`, can be optionally given an option object with a `model` property to control the mapping.

`hasMany` also accepts `inverseOf` and `defaults` properties.  If an inverseOf is provided,
when a model is added to the array, it will have the property named by `inverseOf` to the parent model

If `defaults` are provided the new model's attributes will be defaulted to them.  `defaults` may
also be a function, which will be called and it's return values used.

An `extend` property can be provided.  If `extend` is a function it will called with the collection whenever one is created.  If `extend` is an object, it's properties will be copied onto the collection.

Like `belongsTo`, `hasMany` also converts object assignment to a model

```javascript
@identifiedBy('tire')
class Tire {
    @session radius;
    @belongsTo vehicle; // will be autoset by the `inverseOf: auto` on Car
}

// will be mixed into Car's tires assocation, so one could call: car.tires.areEqualSize()
const TireHelpers = {
    areEqualSize() {
        return this.every(t => t.radius === this[0]);
    }
};

@identifiedBy('car')
class Car {
    @belongsTo home;
    @session color;
    @hasMany({ model: 'Tire', inverseOf: 'vehicle', defaults: {radius: 17}, extend: TireHelpers }) tires;
}

@identifiedBy('garage')
class Garage {
    @session owner;
    @hasMany({
        model: 'Car',
        inverseOf: 'home',
        defaults(collection, parent) {
            return { color: this.owner.favoriteColor };
        }
    }) cars;
}
```

##  Custom serialization

Custom serialize/deserialize behaviour can be implemented by registering a custom 'type'.

The object that's configured for a type must have two methods `serialize` and `deserialize`.

An example of a value that should is stored as a string but is more convenient to access as a float.

```javascript
import { registerCustomType, identifiedBy, identifier, field } from 'mobx-decorated-models';

registerCustomType('cargo', {
    serialize(cargo) {
        return String(cargo);
    },
    deserialize(count) {
        return parseFloat(count);
    },
});

@identifiedBy('boat')
export class Ship {
    @identifier name;

    @field({ type: cargoSerializer }) cargo;
}

const boat = Ship.deserialize({ id: 1, cargo: '3.1415' });
boat.cargo // 3.14159
boat.serialize() // { id: 1, cargo: "3.1415" }
```

**Note**: The above example does not deal with null/undefined or perform any validation. Real type handlers should deal with unexpected values.

## unresolvedAssociations

mobx-decorated-models attempts to do lazy lookups for the model that **hasMany** and **belongsTo** should use.  In order to do so, it keeps track of associations that are not immediatly resolved in the hope that the model for them will be decorated with **@identifiedBy** later.

However if the model is never decorated the association will continue to be set to a plain observable.object.

Properties that are not resolved can be listed using the `unresolvedAssociations` method, which will return an array of object with model and property keys.

**Example:**
```javascript

import { model, field, session, belongsTo, hasMany, identifier } from 'mobx-decorated-models';

@identifiedBy('shape')
class Parallelogram {

}

@identifiedBy('box')
class Box {
    hasMany sides;
}

unresolvedAssociations().forEach(({ model, property }) => {
    console.log(`The model for ${model.identifiedBy}(${property}) cannot be found`);
});

// outputs: The model for box(sides) cannot be found
```
