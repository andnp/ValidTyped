import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a null value', () => {
    const x: any = null;

    const validator = v.nil();

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, null>();
        pass();
    } else {
        fail();
    }
});

test('Can validate not a null value', () => {
    const x: any = 'hey';

    const validator = v.nil();

    if (validator.isValid(x)) fail();
    else pass();
});
