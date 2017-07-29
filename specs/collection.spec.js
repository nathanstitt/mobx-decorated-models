import { identifiedBy } from '../lib/class-decorator';
import createCollection from '../lib/collection';

@identifiedBy('colTest')
class ModelInCollection {
    constructor(attrs) { Object.assign(this, attrs); }
}

describe('Collections', () => {
    it('it forces assignment into models', () => {
        const collection = createCollection({ model: ModelInCollection });
        collection.push({ foo: 'bar' });
        expect(collection).toHaveLength(1);
        expect(collection[0].foo).toEqual('bar');
        expect(collection[0]).toBeInstanceOf(ModelInCollection);
    });

    it('can use string id lookup', () => {
        const collection = createCollection({ model: 'colTest' });
        collection.push({ foo: 'bar' });
        expect(collection[0]).toBeInstanceOf(ModelInCollection);
    });

    it('passes models on unmolested', () => {
        const model = new ModelInCollection();
        const collection = createCollection({ model: ModelInCollection });
        collection.push(model);
        expect(collection[0]).toBe(model);
    });
});
