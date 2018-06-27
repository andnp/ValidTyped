import * as v from 'index';
import { pass } from '../helpers/assert';

test('Can validate an any type', () => {
    const things: any[] = [
        22,
        'yellow',
        false,
        {},
        undefined,
        null,
        () => ({}),
    ];

    const validator = v.any();

    things.forEach(thing => {
        if (validator.isValid(thing)) pass();
        else fail();
    });

});
