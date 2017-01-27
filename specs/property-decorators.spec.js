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

    xit('merges both attributes and session props', () => {
        const box = Box.deserialize({ width: 3, isVisible: true });
        expect(box.isVisible).toEqual(true);
    });

    it('can objserve associations', () => {
        const container = Container.deserialize({ id: 1, firstName: 'Bob', lastName: 'Smith' });
        const spy = jest.fn();
        autorun(() => {
            spy(container.boxes.length);
        });
        expect(container.areaInUse).toEqual(0);
        container.boxes.push(Box.deserialize({ id: 1, width: 8, depth: 12, height: 8 }));
        container.boxes.push(Box.deserialize({ id: 2, width: 3, depth: 12, height: 4 }));
        container.boxes[1].width = 4;
        expect(container.areaInUse).toEqual(960);
        expect(spy).toHaveBeenCalledTimes(3);
    });
});
