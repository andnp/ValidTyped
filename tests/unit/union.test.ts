import * as v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate a number or string', () => {
    const x: any = 22;
    const y: any = 'hey';

    const validator = v.union([ v.string(), v.number() ]);

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, string | number>();
        pass();
    } else {
        fail();
    }

    if (validator.isValid(y)) {
        assertTypesEqual<typeof y, string | number>();
        pass();
    } else {
        fail();
    }
});

test('Can validate not a string or number', () => {
    const x: any = false;

    const validator = v.union([ v.string(), v.number() ]);

    if (validator.isValid(x)) fail();
    else pass();
});
