import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a string', () => {
    const x: any = 'hey there';

    const validator = v.string();

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, string>();
        pass();
    } else {
        fail();
    }
});

test('String is in enum', () => {
    const x: any = 'a';

    const validator = v.string(['a', 'b', 'c']);

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, 'a' | 'b' | 'c'>();
        pass();
    } else {
        fail();
    }
});

test('String is not in enum', () => {
    const x: any = 'd';

    const validator = v.string(['a', 'b', 'c']);

    if (validator.isValid(x)) fail();
    else pass();
});
