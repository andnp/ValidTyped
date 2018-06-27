import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a boolean', () => {
    const x: any = false;

    const validator = v.boolean();

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, boolean>();
        pass();
    } else {
        fail();
    }
});

test('Can validate not a boolean', () => {
    const x: any = 'hey';

    const validator = v.boolean();

    if (validator.isValid(x)) fail();
    else pass();
});
