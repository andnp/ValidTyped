import { Schema } from 'type-level-schema/schema';
import { Nominal } from 'simplytyped';
import * as Ajv from 'ajv';

import { assertTypesEqual, pass, fail } from '../helpers/assert';

import * as v from 'index';

const ajv = new Ajv();

test('Can generate a valid json schema', () => {
    const validator = v.object({
        thing: v.string(),
        thing2: v.string(['a', 'b', 'c']),
        thing3: v.boolean(),
        thing4: v.nominal(v.string(), 'TestType'),
    });

    const schema = validator.getSchema();

    const expected: Schema = {
        type: 'object' as 'object',
        properties: {
            thing: { type: 'string' as 'string' },
            thing2: { type: 'string' as 'string', enum: [ 'a' as 'a', 'b' as 'b', 'c' as 'c']},
            thing3: { type: 'boolean' },
            thing4: { type: 'string' as 'string' },
        },
        required: ['thing', 'thing2', 'thing3', 'thing4'],
    };

    expect(schema).toEqual(expected);
});

test('Generates correct type for validated object', () => {
    const validator = v.object({
        thing: v.string(),
        thing2: v.string(['a', 'b', 'c']),
        thing3: v.boolean(),
        thing4: v.nominal(v.string(), 'TestType'),
    });

    const x: any = {
        thing: '',
        thing2: 'a',
        thing3: false,
        thing4: 'merp',
    };

    if (validator.isValid(x)) {
        interface ExpectedType {
            thing: string;
            thing2: 'a' | 'b' | 'c';
            thing3: boolean;
            thing4: Nominal<string, 'TestType'>;
        }

        const v = ajv.validate(validator.getSchema(), x);
        expect(v).toBe(true);
        assertTypesEqual<typeof x, ExpectedType>();
    } else {
        expect(false).toBe(true);
    }
});

test('Validates a deep object', () => {
    const validator = v.object({
        arr: v.array([
            v.number(),
            v.object({
                o: v.object({
                    a: v.number(),
                }),
            }),
        ]),
    });

    const x: any = {
        arr: [22, {
            o: {
                a: 22,
            },
        }],
    };

    if (validator.isValid(x)) {
        pass();
        assertTypesEqual<typeof x, {
            arr: [
                number,
                { o: { a: number } }
            ],
        }>();
    } else {
        fail();
    }
});

test('Can add json schema metadata', () => {
    const validator = v.object({
        thing: v.string(),
    }).setSchemaMetaData({
        title: 'ThingSchema',
        description: 'This is a thing schema',
    });

    const obj: any = { thing: 'hi' };
    const result = validator.validate(obj);
    if (result.valid) {
        expect(result.data).toEqual({ thing: 'hi' });
    } else {
        type Got = typeof result;
        interface Expected {
            valid: false;
            errors: Ajv.ErrorObject[];
        }
        assertTypesEqual<Got, Expected>();
        fail();
    }
});
