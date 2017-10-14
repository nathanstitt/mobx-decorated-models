import { findModel } from '../lib/model-lookup';
import { Container, Box, Ship } from './test-models';
import { unresolvedAssociations } from '../lib/class-decorator';

describe('Class Decorators', () => {
    it('adds static deserialize method and serialize to prototype', () => {
        const attrs = { id: 42,
            name: 'TV1',
            location: 'mid-ship',
            tags: [],
            boxes: [
                { id: 1, width: 8, depth: 12, height: 8 },
            ] };
        const container = Container.deserialize(attrs);
        expect(container.boxes).toHaveLength(1);
        expect(container.serialize()).toMatchSnapshot();
    });

    it('can serialize/deserialize dates', () => {
        const ship = Ship.deserialize({ embarks: '2013-10-21T13:28:06.419Z' });
        expect(ship.embarks).toBeInstanceOf(Date);
        expect(ship.embarks).toEqual(new Date('2013-10-21T13:28:06.419Z'));
        expect(ship.serialize()).toMatchObject({ embarks: '2013-10-21T13:28:06.419Z' });
    });

    it('can deserialize arrays', () => {
        const json = [
            { id: 1, width: 8, depth: 12, height: 8 },
            { id: 2, width: 8, depth: 12, height: 8 },
            { id: 3, width: 8, depth: 12, height: 8 },
        ];
        const boxes = Box.deserialize(json);
        expect(boxes).toHaveLength(3);
        expect(boxes[0].id).toEqual(1);
        expect(boxes[1].id).toEqual(2);
        expect(boxes[2].id).toEqual(3);
    });

    it('can serialize/deserialize nested objects', () => {
        const box = new Box();
        box.update({
            metadata: {
                one: 1,
                two: ['one', 'three'],
                four: { test: true },
            },
        });
        expect(box.serialize().metadata).toEqual(
            expect.objectContaining({
                one: 1,
                four: expect.objectContaining({ test: true }),
                two: expect.arrayContaining([]),
            }),
        );
        expect(box.metadata.one).toEqual(1);
        expect(box.metadata.four.test).toBe(true);
    });

    it('adds update method to prototype', () => {
        const attrs = { id: 2,
            width: 3,
            depth: 12,
            height: 4,
            container: {
                id: 1, name: '#12', location: 'Building #1',
            } };
        const box = new Box();
        box.update(attrs);
        expect(box.serialize()).toMatchSnapshot();
    });

    it('works with belongsTo', () => {
        const box = new Box();
        const container = { id: 1, name: '#12', location: 'Building #1' };
        box.update({ id: 32, width: 3, depth: 12, height: 4, container });
        expect(box.container).toBeInstanceOf(Container);
        expect(box.serialize()).toMatchSnapshot();
    });

    it('can assign when a model is given for a belongsTo', () => {
        const box = new Box();
        const boat = Ship.deserialize({ box });
        expect(boat.box).toBe(box);
    });

    it('only builds a single class for belongsTo', () => {
        const box = new Box();
        Ship.buildSpy = jest.fn();
        box.update({
            watercraft: {
                name: 'test1234',
            },
        });
        expect(box.watercraft).toBeInstanceOf(Ship);
        expect(Ship.buildSpy).toHaveBeenCalledTimes(1);
    });

    it('hasMany', () => {
        const container = new Container({ id: 1, name: 'C23', location: 'z1' });
        container.boxes.push(new Box());
        container.boxes.push(new Box());
        container.boxes[1].width = 4;
        // hasMany sets the inverseOf, but it isn't serialized
        expect(container.boxes[0].container).toBe(container);
        expect(container.serialize()).toMatchSnapshot();
    });

    it('sets identifier from decorator', () => {
        expect(Ship.identifiedBy).toEqual('boat');
        expect(() => { Ship.identifiedBy = 'bar'; }).toThrow();
        expect(findModel('ship', 'boat')).toBe(Ship);
    });

    it('reports on associations that are not resolved', () => {
        const box = Box.deserialize({ vessel: { id: 1 } });
        expect(box.vessel).toEqual({ id: 1 });
        expect(box.vessel).not.toBeInstanceOf(Ship);

        const pending = unresolvedAssociations();
        expect(pending).toHaveLength(1);
        expect(pending[0].model).toBe(Box);
        expect(pending[0].property).toEqual('vessel');
    });
});
