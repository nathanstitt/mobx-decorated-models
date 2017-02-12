import { Box, Container } from './test-models';
import { autorun, observable } from 'mobx';
import { update } from 'serializr';

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

    it('sets an inverse', () => {
        const container = Container.deserialize({ id: 1, name: 'Bob', location: 'water' });
        container.boxes.push({});
        expect(container.boxes[0]).toBeInstanceOf(Box);
        expect(container.boxes[0].container).toEqual(container);
    });

    xit('merges both attributes and session props', () => {
        const box = Box.deserialize({ width: 3, isVisible: true });
        expect(box.isVisible).toEqual(true);
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
        expect(box.metadata.toJS()).toEqual({ barcode: 'Z12', color: 'black' });
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

});
