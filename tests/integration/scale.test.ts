import * as v from 'index';
import { pass } from '../helpers/assert';

test('Ajv compiles only one instance of schema', () => {
    const validator = v.object({
        a: v.string([ 'a', 'b', 'c' ]),
        b: v.number(),
        c: v.boolean(),
    });

    const t = Date.now();
    for (let i = 0; i < 2e4; ++i) {
        const o = {
            a: 'a',
            b: Math.random(),
            c: false,
        };

        if (validator.isValid(o)) pass();
        else fail();
    }

    const took = Date.now() - t;

    expect(took).toBeLessThan(8000);
});
