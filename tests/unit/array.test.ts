import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate an array', () => {
    const x: any = [21, 22, 23];

    const validator = v.array(v.number());

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, number[]>();
        pass();
    } else {
        fail();
    }
});

test('Can validate a deep array', () => {
    const x: any = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
    ];

    const validator = v.array(v.array(v.number()));

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, number[][]>();
        pass();
    } else {
        fail();
    }
});

test('Can add JSON Schema options', () => {
    const x: any = [ 'yellow!' ];

    const validator = v.array(v.any())
        .withOptions({ minItems: 2 });

    // expect to fail because we have fewer than 2 items
    if (validator.isValid(x)) fail();
    else pass();
});
