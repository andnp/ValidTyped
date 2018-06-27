import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can combine two schema', () => {
    const x: any = 'hi';

    const validator = v.string().or(v.number());

    if (validator.isValid(x)) {
        type got = typeof x;
        type expected = string | number;
        assertTypesEqual<got, expected>();
        assertTypesEqual<expected, got>();
        pass();
    } else {
        fail();
    }
});
