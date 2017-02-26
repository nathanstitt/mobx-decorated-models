import { observable, computed } from 'mobx';
import { modelDecorator, field, session, belongsTo, hasMany, identifier } from '../index';

class RectangularCuboid {
    constructor(attrs) {
        Object.assign(this, attrs);
        this.isCuboid = true;
    }
}

@modelDecorator('boat')
export class Ship {
    @identifier name;

    @belongsTo({ inverseOf: 'vessel' }) box;
}

@modelDecorator('box')
export class Box extends RectangularCuboid {
    @identifier id;

    @field width  = 1;
    @field height = 1;
    @field depth  = 1;
    @field({ type: 'object' }) metadata;

    @session color;
    @session vessel_association_name;

    @computed get volume() {
        return this.width * this.height * this.depth;
    }
    @belongsTo vessel;
    @belongsTo({ model: 'boat' }) watercraft;
    @belongsTo container;
}

@modelDecorator('container')
export class Container extends RectangularCuboid {
    @identifier id;

    @field name;
    @field location;
    @field({ type: 'array' }) tags = [];

    @session color;

    @computed get description() {
        return `${this.name} ${this.location}`;
    }

    @hasMany({
        model: 'box',
        inverseOf: 'container',
        defaults() {
            return { color: this.color };
        },
    }) boxes;

    @computed get areaInUse() {
        return this.boxes.reduce((acc, box) => (acc += box.volume), 0);
    }
}
