import { computed } from 'mobx';
import { identifiedBy, field, identifier } from '../index';

@identifiedBy('mocked-boat')
export default class MockedBoat {

    @identifier name;

    @field cargoCount;
    @field({ type: 'date' }) embarks;

    @computed get cargoSquared() {
        return this.cargoCount * 2;
    }

    test() {
        return 'not-mocked';
    }

}
