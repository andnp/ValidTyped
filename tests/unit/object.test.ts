import v from 'index';
import { fail, pass, assertTypesEqual } from '../helpers/assert';

test('Can validate an object', () => {
    const x: any = {
        a: 'merp',
        b: 22,
        c: false,
    };

    const validator = v.object({
        a: v.string(),
        b: v.number(),
        c: v.boolean(),
    });

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, { a: string, b: number, c: boolean }>();
        pass();
    } else {
        fail();
    }
});

test('Can validate a deep object', () => {
    const x: any = {
        a: {
            b: 'merp'
        },
        c: 22,
    };

    const validator = v.object({
        a: v.object({
            b: v.string(),
        }),
        c: v.number(),
    });

    if (validator.isValid(x)) {
        assertTypesEqual<typeof x, { a: { b: string }, c: number }>();
        pass();
    } else {
        fail();
    }
});

test('Can validate an object cannot be missing a property', () => {
    const x: any = {
        a: 'hi',
        b: 22,
    };

    const validator = v.object({
        a: v.string(),
        b: v.number(),
        c: v.boolean(),
    });

    if (validator.isValid(x)) fail();
    else pass();
});

test('Can make certain object properties optional', () => {
    const x: any = {
        a: 'yellow',
        b: 22,
    };

    const validator = v.object({
        a: v.string(),
        b: v.number(),
        c: v.boolean(),
    }, {
        optional: ['c'],
    });

    if (validator.isValid(x)) {
        pass();

        interface Type {
            a: string;
            b: number;
            c?: boolean;
        }

        assertTypesEqual<typeof x, Type>();
    } else {
        fail();
    }
});
