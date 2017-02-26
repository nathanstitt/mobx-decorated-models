# Decorators for creating model type structures with mobx

mobx-decorated-models is a collection of es7 decorators to make a class observable and serializable.

[![Build Status](https://travis-ci.org/nathanstitt/mobx-decorated-models.svg?branch=master)](https://travis-ci.org/nathanstitt/mobx-decorated-models)

## Introduction

[Mobx](https://mobx.js.org) makes state management super simple, but it doesn't offer an
opinion on how to get data in and out of the observed data structures.

[Serializr](https://github.com/mobxjs/serializr) takes care of that nicely.

Combining the two libraries isn’t difficult, but then you end up specifing each attribute twice;
once so Mobx will observe it, and once to create a schema for Serializr.

This library is a collection of decorators that co-ordinates making
fields both observable and serializable.

While it’s at it, it also handles model lookups so different models can refer
to one another regardless of import order. When one model refers to another, a
reference of the requirement is stored and then later resolved when the class becomes known.

## Example

```javascript
import { model, field, session, belongsTo, hasMany, identifier } from 'mobx-decorated-models';

@modelDecorator('box')
export class Box {
    @identifier id;
    @field width  = 0;
    @field height = 0;
    @field depth  = 0;

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
console.log(box.serialize()); // => { id: 1, width: 2, height: 3, depth: 8, items: [] }
```

### Controlling model lookups

The class `@modelDecorator` uses either the `name` property of each class, or can be supplied with a unique string that should be used  as a lookup key so
that `hasMany` and `belongsTo` relation ships can be established.

This allows things like the below mappings to still work even though the two files can't easily include each other:


```javascript
// chair.js

import { modelDecorator, belongsTo } from 'mobx-decorated-models';

@modelDecorator('chair')
class Chair {
    belongsTo 'table'
}


// table.js
import { model, hasMany } from 'mobx-decorated-models';

@modelDecorator('table')
class Table {
    hasMany({ model: 'chair' }) 'seats'
}
```

### Decorators

#### model

Marks a class as serializable.

It adds a few convenience methods to classes:

 * static `deserialize` method.  Used to turn JSON structure into a model (or collection of models)
 * an `update` method.  Updates a model's attributes and child associations.
 * `serialize`.  Converts the model's attributes and it's associations to JSON.

However, it's primary purpose is to remember classes for hasMany/belongsTo lookups. See discussion
above regarding `lookupModelUsing` and `rememberModelUsing`.

#### identifier

The primary key for the model

#### field

marks a class property as observable and serializable.

The type of field can be set to `array` or `object` by specifying options.

*example:*

```javascript
@modelDecorator
class Foo {
  @field({ type: 'object' }) options; // will default to an observable map
  @field({ type: 'array'  }) tags;    // defaults to []
}

const foo = new Foo();
foo.tags.push('one');
foo.options.set('one', 1);
foo.serialize(); // => { tags: ['one'], options: { one: 1 } }
```


#### belongsTo

Makes a property as referring to another model.  Will attempt to map
the referenced class based on the name, i.e. a property named `box` will
look for a class named `Box`.

Optionally can be given an option object with a `model` property to control the mapping.

`model` can be either a string which matches a value given to the modelDecorator, or a reference to the model itself.

*example:*

```javascript
@modelDecorator
class Person({
    @identifier id;
    @field name;
    // finds a model that was set to use the id `pants` by it's decorator
    @belongsTo({ model: 'pants', inverseOf: 'owner' }) outfit;
    speak(msg) {
        console.log(`${this.name} says: ${msg}`);
    }
})

@modelDecorator('pants')
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

#### hasMany

Marks a property as belonging to an mobx observable array of models.

Sets the default value to an empty observable array

As in `belongsTo`, can be optionally given an option object with a `model` property to control the mapping.

`hasMany` also accepts `inverseOf` and `defaults` properties.  If an inverseOf is provided,
when a model is added to the array, it will have the property named by `inverseOf` to the parent model

If `defaults` are provided the new model's attributes will be defaulted to them.  `defaults` may
also be a function, which will be called and it's return values used.

Like `belongsTo`, `hasMany` also converts object assignment to a model

```javascript
@modelDecorator
class Tire {
    @session numberInSet;
    @belongsTo vehicle; // will be autoset by the `inverseOf: auto` on Car
}

@modelDecorator
class Car {
    @belongsTo home;
    @session color;
    @hasMany({ model: 'Tire', inverseOf: 'vehicle', defaults: {numberInSet: 4} }) tires;
}

@modelDecorator
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

## unresolvedAssociations

mobx-decorated-models attempts to do lazy lookups for the model that **hasMany** and **belongsTo** should use.  In order to do so, it keeps track of associations that are not immediatly resolved in the hope that the model for them will be decorated with **@modelDecorator** later.

However if the model is never decorated the association will continue to be set to a plain observable.object.

Properties that are not resolved can be listed using the `unresolvedAssociations` method, which will return an array of object with model and property keys.

**Example:**
import { model, field, session, belongsTo, hasMany, identifier } from 'mobx-decorated-models';

@modelDecorator
class Parallelogram {

}

@modelDecorator('box')
class Box {
    hasMany sides;
}

unresolvedAssociations().forEach(({ model, property }) => {
    console.log(`The model for ${model.identifiedBy}(${property}) cannot be found`);
});

// outputs: The model for box(sides) cannot be found


# Future plans

 * Sessions: properties that will be set from JSON but won't be serialized.  https://github.com/mobxjs/serializr/pull/32 is needed before this can be supported
