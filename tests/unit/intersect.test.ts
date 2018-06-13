import v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate an intersection of objects', () => {
    const x: any = { a: '', b: 22 };

    const v1 = v.object({ a: v.string() });
    const v2 = v.object({ b: v.number() });

    const validator = v.intersect(v1, v2);

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
