import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a record', () => {
    const x: any = {
        a: 22,
        b: 'merp',
    };

    const validator = v.record(v.union([ v.string(), v.number() ]));

    if (validator.isValid(x)) {
        type got = typeof x;
        type expected = Record<string, string | number>;
        assertTypesEqual<got, expected>();
        assertTypesEqual<expected, got>();
        pass();
    } else {
        fail();
    }
});

test('Can validate not a correct record', () => {
    const x: any = {
        a: 22,
        b: 'merp',
        c: false,
    };

    const validator = v.record(v.union([ v.string(), v.number() ]));

    if (validator.isValid(x)) fail();
    else pass();
});
