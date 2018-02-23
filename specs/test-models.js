import { observable, computed } from 'mobx';
import {
    identifiedBy, field, session, belongsTo, hasMany, identifier, registerCustomType,
} from '../index';

class RectangularCuboid {

    constructor(attrs) {
        Object.assign(this, attrs);
        this.isCuboid = true;
    }

}

export class Radio {

    constructor(frequency) {
        this.frequency = frequency;
    }
    static serialize(radio) {
        return radio ? radio.frequency : null;
    }
    static deserialize(frequency) {
        return new Radio(frequency);
    }

}
registerCustomType('radio', Radio);

const shipCargoSerializer = [
    a => (a ? a - 1 : a),
    b => (b ? b + 3 : b),
];

@identifiedBy('registration')
export class Registration {

    constructor(id) {
        this.id = id;
    }
    static serialize(reg) {
        return reg ? reg.id : '';
    }

}

@identifiedBy('boat')
export class Ship {

    @identifier name;
    @field({ model: 'registration' }) registration;
    @field({ type: 'radio' }) radio;
    @field({ serializer: shipCargoSerializer }) cargoCount;
    @field({ type: 'date' }) embarks;
    @belongsTo({ inverseOf: 'vessel' }) box;
    @hasMany({ model: Registration }) homePorts;

    constructor(attrs) {
        if (this.constructor.buildSpy) { this.constructor.buildSpy(attrs); }
    }

}

@identifiedBy('dimension')
export class Dimension {

    constructor(attrs) {
        Object.assign(this, attrs);
    }

}

@identifiedBy('box')
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
    @observable vessel_association_name;
    @belongsTo({ model: 'boat' }) watercraft;
    @belongsTo container;

    @hasMany({
        model: Dimension,
        extend: (array) => {
            Object.defineProperty(array, 'volume', {
                get() { return this.length * 2; },
            });
        },
    }) sides;

}

const BoxExtensions = {
    identifiers() {
        return this.map(b => b.id);
    },
};

@identifiedBy('container')
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
        extend: BoxExtensions,
    }) boxes;

    @computed get areaInUse() {
        return this.boxes.reduce((acc, box) => (acc + box.volume), 0);
    }

}
