import { autorun } from 'mobx';
import { Box, Container, Ship } from './test-models';
import { isSerializable } from '../lib/serializable';

describe('Property Decorators', () => {

    it('it doesn’t interfere with inheritance', () => {
        const container = new Container();
        expect(container.isCuboid).toEqual(true);
    });

    it('has attributes that are observable', () => {
        const box = new Box();
        box.width = 3;
        const spy = jest.fn();
        autorun(() => {
            spy(box.volume);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        box.width = 3; // is already 3
        expect(spy).toHaveBeenCalledTimes(1);
        box.width = 8;
        expect(spy).toHaveBeenCalledTimes(2);
        box.temp = 'test, test'; // non existant field
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('sets attributes using provided values', () => {
        const box = new Box();
        box.update({ width: 3, depth: 12, height: 2, bad: true });
        expect(box.width).toEqual(3);
        expect(box.bad).toBeUndefined();
        expect(box.volume).toEqual(72);
    });

    it('sets defaults for hasMany', () => {
        const container = Container.deserialize({ color: 'blue' });
        container.boxes.push({});
        expect(container.boxes[0].color).toEqual('blue');
    });

    it('sets an inverse for hasMany', () => {
        const container = Container.deserialize({ id: 1, name: 'Bob', location: 'water' });
        container.boxes.push({});
        expect(container.boxes[0]).toBeInstanceOf(Box);
        expect(container.boxes[0].container).toBe(container);
        expect(container.boxes[0].container_association_name).toEqual('boxes');
    });

    it('finds model for belongsTo', () => {
        const box = Box.deserialize({ id: 1, watercraft: { name: 'Boaty' } });
        expect(box.watercraft).toBeInstanceOf(Ship);
    });

    it('sets an inverse for belongsTo', () => {
        const ship = Ship.deserialize({ name: 'HMS Mobx', box: { width: 42 } });
        expect(ship.box.depth).toEqual(1);
        expect(isSerializable(ship, 'box')).toBe(true);
        expect(isSerializable(ship.box, 'vessel')).toBe(false);
        expect(ship.serialize()).toEqual({
            name: 'HMS Mobx',
            box: { depth: 1, height: 1, metadata: {}, width: 42 },
        });
        expect(ship.box.vessel_association_name).toEqual('box');
    });

    it('merges both attributes and session props', () => {
        const box = Box.deserialize({ width: 3, color: 'red' });
        expect(box.color).toEqual('red');
        // no color
        expect(box.serialize()).toEqual({ depth: 1, height: 1, metadata: {}, width: 3 });
    });

    it('can observe associations', () => {
        const container = Container.deserialize({ id: 1, name: 'Bob', location: 'water' });
        const spy = jest.fn();
        autorun(() => {
            spy(container.boxes.length);
        });
        expect(container.areaInUse).toEqual(0);
        container.boxes.push({ id: 1, width: 8, depth: 12, height: 8 });
        container.boxes.push({ id: 2, width: 3, depth: 12, height: 4 });
        container.boxes[1].width = 4;
        expect(container.areaInUse).toEqual(960);
        expect(spy).toHaveBeenCalledTimes(3);
    });

    it('can set property to be object', () => {
        const box = Box.deserialize({
            width: 3, metadata: { barcode: 'Z12', color: 'black' },
        });
        expect(box.metadata).toEqual({ barcode: 'Z12', color: 'black' });
        expect(box.serialize()).toEqual({
            container: undefined, depth: 1, height: 1, id: undefined, width: 3,
            metadata: { barcode: 'Z12', color: 'black' },
        });
    });

    it('can set property to be array', () => {
        const tags = ['one', 'two', 'three'];
        const container = Container.deserialize({ id: 1, tags });
        expect(container.tags.slice()).toEqual(tags);
        expect(container.serialize()).toEqual({
            boxes: [], id: 1, location: undefined, name: undefined, tags,
        });
    });

    it('guards against setting a belongsTo', () => {
        const ship = Ship.deserialize({ name: 'HMS Glory' });
        ship.box = { width: 1, height: 1, depth: 1 };
        expect(ship.box).toBeInstanceOf(Box);
        expect(ship.box.vessel).toBe(ship);
    });

    it('passes on values that can’t be handled', () => {
        const ship = Ship.deserialize({ name: 'HMS Glory' });
        expect(ship.box).toBeUndefined();
        ship.box = undefined;
        expect(ship.box).toBeUndefined();
        ship.box = 1;
        expect(ship.box).toBe(1);
        const container = new Container();
        container.boxes = [{ id: 1 }];
        expect(container.boxes[0]).toBeInstanceOf(Box);
        container.boxes = undefined;
        expect(container.boxes).toBeUndefined();
        container.boxes = [{ id: 1 }, null];
        expect(container.boxes[0].id).toBe(1);
        expect(container.boxes[1]).toBeNull();
    });

    it('guards against setting a hasMany', () => {
        const container = Container.deserialize({ id: 1 });
        const originalBoxes = container.boxes;
        container.boxes = [
            { width: 1, height: 1, depth: 1 },
            { width: 2, height: 2, depth: 2 },
        ];
        expect(container.boxes).toBe(originalBoxes);
        expect(container.boxes[0]).toBeInstanceOf(Box);
        expect(container.boxes[1].container).toBe(container);
    });


});
