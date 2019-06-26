import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can make a schema nullable', () => {
    const x: any = null;

    const validator = v.string().orNull();

    if (validator.isValid(x)) {
        type got = typeof x;
        type expected = string | null;
        assertTypesEqual<got, expected>();
        assertTypesEqual<expected, got>();
        pass();
    } else {
        fail();
    }
});
