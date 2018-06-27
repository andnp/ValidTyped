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

test('Can chain `and` operators', () => {
    const x: any = { a: '', b: 22, c: false };

    const v1 = v.object({ a: v.string() });
    const v2 = v.object({ b: v.number() });
    const v3 = v.object({ c: v.boolean() });

    const and = v1.and(v2).and(v3);

    if (and.isValid(x)) {
        type got = typeof x;
        type expected = { a: string, b: number, c: boolean };
        assertTypesEqual<got, expected>();
        assertTypesEqual<expected, got>();
        pass();
    } else {
        fail();
    }
});
