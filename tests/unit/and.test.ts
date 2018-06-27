import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can combine two schema', () => {
    const x: any = { a: '', b: 22 };

    const validator = v.object({
        a: v.string(),
    }).and(v.object({
        b: v.number(),
    }));

    if (validator.isValid(x)) {
        type got = typeof x;
        type expected = { a: string, b: number };
        assertTypesEqual<got, expected>();
        assertTypesEqual<expected, got>();
        pass();
    } else {
        fail();
    }
});
