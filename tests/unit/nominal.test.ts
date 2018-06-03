import v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';
import { Nominal } from 'simplytyped';

test('Can validate a string but generate a nominal type', () => {
    const x: any = 'hey there';

    const validator = v.nominal(v.string(), 'TestType');

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, Nominal<string, 'TestType'>>();
        pass();
    } else {
        fail();
    }
});
