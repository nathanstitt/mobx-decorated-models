import { Container, Box } from './test-models';
import { modelDecorator } from '../index';
import * as ModelLookup from '../lib/model-lookup';

describe('Model Lookups', () => {
    afterEach(() => {
        ModelLookup.rememberModelUsing(null);
        ModelLookup.lookupModelUsing(null);
    });

    it('can use a custom lookup', () => {
        expect(ModelLookup.findModel('container')).toEqual(Container);
        const spy = jest.fn().mockReturnValue(Box);
        ModelLookup.lookupModelUsing(spy);
        expect(ModelLookup.findModel('container')).toEqual(Box);
        expect(spy).toHaveBeenCalledWith({"model": "container", "property": undefined});
    });

    it('is notified when class is decorated', () => {
        const spy = jest.fn();
        ModelLookup.rememberModelUsing(spy);
        @modelDecorator
        class ThisIsTest { }
        expect(spy).toHaveBeenCalledWith(ThisIsTest);
        expect(ModelLookup.findModel('ThisIsTest')).toBeUndefined();
    });
});
