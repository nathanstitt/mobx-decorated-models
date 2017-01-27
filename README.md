# Decorators for creating model type structures with mobx

mobx-decorated-models is a collection of es7 decorators that help decorate a
class to make it easily observable and serializable.

[![Build Status](https://travis-ci.org/nathanstitt/mobx-decorated-models.svg?branch=master)](https://travis-ci.org/nathanstitt/mobx-decorated-models)

## Introduction

[Mobx](https://mobx.js.org) makes state management super simple, but it doesn't have any
opinion on how to get data in and out of the observed data structures.

[Serializr](https://github.com/mobxjs/serializr) takes care of that nicely.

Combining the two libraries isn't difficult, but it mean you end up specifing each attribute twice,
once so Mobx will observe it and once to create a schema for Serializr.

This library is a collection of decorators that will make co-ordinate making
fields both observable and serializable.

## Example

```javascript
import { model, field, session, belongsTo, hasMany, identifier } from 'mobx-decorated-models';

@model
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
    @belongsTo({ model: 'Address' }) warehouse;
}
```

additional examples used for testing are located in `specs/test-models.js`

```javascript
boxes = @observable.array([])
fetch('/my/api/endpoints/boxes/1.json').then(function(response) {
  boxes.concat(Box.deserialize(response.json()));
});

box = new Box();
box.update({ width: 2, height: 3, depth: 8 });
box.volume(); // => 48
```

### Decorators



#### model

Marks a class as serializable.

It adds a few convenience methods:

 * static `deserialize` method.  Used to turn JSON structure into a model (or collection of models)
 * an `update` method.  Updates a model's attributes and child associations.
 * `serialize`.  Converts the model's attributes and it's associations to JSON.

#### identifier

The primary key for the model

#### field

marks a class property as observable and serializable.

#### belongsTo

Makes a property as referring to another model.  Will attempt to map
the referenced class based on the name, i.e. a property named `box` will
look for a class named `Box`.

Optionally can be given an option object with a `className` property to control the mapping.

*example:*

```javascript
class Foo {
  @belongsTo bar; // will look for a `Bar` class
  @belongsTo({ className: 'Person' }) name; // looks for class `Person`
}
```

#### hasMany

Makes a property as belonging to an array of model.  Sets the default value to an observable array

As in `belongsTo`, can be optionally given an option object with a `className` property to control the mapping.


# Future plans

 * Use a provided lookup function to control the lookup
 * Sessions properties that will be set from JSON but won't be serialized
