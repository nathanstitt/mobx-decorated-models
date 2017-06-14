import MockedModel from './mocked-model';

jest.mock('./mocked-model');

describe('Mocking Models with Decorators', () => {
    it('doesnt explode and replaces methods', () => {
        const model = new MockedModel();
        expect(model.test()).toBeUndefined();
        expect(model.test).toHaveBeenCalled();
    });
});
