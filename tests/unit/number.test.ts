import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a number', () => {
    const x: any = 22;

    const validator = v.number();

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, number>();
        pass();
    } else {
        fail();
    }
});

test('Can validate not a number', () => {
    const x: any = 'hey';

    const validator = v.number();

    if (validator.isValid(x)) fail();
    else pass();
});
