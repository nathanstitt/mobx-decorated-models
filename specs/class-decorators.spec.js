import { Container, Box } from './test-models';

describe('Class Decorators', () => {
    it('adds static deserialize method and serialize to prototype', () => {
        const attrs = { id: 42, name: 'TV1', location: 'mid-ship', tags: [], boxes: [
            { id: 1, width: 8, depth: 12, height: 8 },
        ] };
        const container = Container.deserialize(attrs);
        expect(container.boxes).toHaveLength(1);
        expect(container.serialize()).toEqual({
            id: 42, location: 'mid-ship', name: 'TV1', tags: [],
            boxes: [
                { container: undefined, depth: 12, height: 8, id: 1, metadata: {}, width: 8 },
            ],
        });
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

    it('adds update method to prototype', () => {
        const attrs = { id: 2, width: 3, depth: 12, height: 4, container: {
            id: 1, name: '#12', location: 'Building #1',
        } };
        const box = new Box();
        box.update(attrs);
        expect(box.serialize()).toEqual({
            container: { boxes: [], id: 1, location: 'Building #1', name: '#12', tags: [] },
            depth: 12, height: 4, id: 2, metadata: {}, width: 3,
        });
    });

    it('works with belongsTo', () => {
        const box = new Box();
        const container = { id: 1, name: '#12', location: 'Building #1' };
        box.update({ id: 32, width: 3, depth: 12, height: 4, container });
        expect(box.serialize()).toEqual({
            container: {
                id: 1, boxes: [], tags: [],
                location: 'Building #1', name: '#12',
            },
            depth: 12, height: 4, id: 32, metadata: {}, width: 3,
        });
    });

    it('hasMany', () => {
        const container = new Container({ id: 1, name: 'C23', location: 'z1' });
        container.boxes.push(new Box());
        container.boxes.push(new Box());
        container.boxes[1].width = 4;
        // hasMany sets the inverseOf, but it isn't serialized
        expect(container.boxes[0].container).toBe(container);
        expect(container.serialize()).toEqual({
            id: 1, location: 'z1', name: 'C23', tags: [],
            boxes: [
                { depth: 1, height: 1, metadata: {}, width: 1 },
                { depth: 1, height: 1, metadata: {}, width: 4 },
            ],
        });
    });
});
