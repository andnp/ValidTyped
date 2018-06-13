import v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a partial object', () => {
    const x: any = { a: '' };

    const validator = v.partial(v.object({
        a: v.string(),
        b: v.number(),
    }));

    if (validator.isValid(x)) {
        type got = typeof x;
        type expected = { a?: string, b?: number };
        assertTypesEqual<got, expected>();
        assertTypesEqual<expected, got>();
        pass();
    } else {
        fail();
    }
});
