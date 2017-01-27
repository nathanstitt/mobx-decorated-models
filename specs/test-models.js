import { observable, computed } from 'mobx';
import { model, field, session, belongsTo, hasMany, identifier } from '../index';

class RectangularCuboid {
    constructor() {
        this.isCuboid = true;
    }
}

@model
export class Box extends RectangularCuboid {
    @identifier id;

    @field width  = 1;
    @field height = 1;
    @field depth  = 1;

    @computed get volume() {
        return this.width * this.height * this.depth;
    }

    @belongsTo container;
}

@model
export class Container extends RectangularCuboid {
    @identifier id;

    @field name;
    @field location;

    @computed get description() {
        return `${this.name} ${this.location}`;
    }

    @hasMany({ className: 'Box', inverseOf: 'container' }) boxes;

    @computed get areaInUse() {
        return this.boxes.reduce((acc, box) => (acc += box.volume), 0);
    }
}
