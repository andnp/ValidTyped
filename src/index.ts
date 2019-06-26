import { objectKeys, Nominal, AnyFunc, AllRequired, Optional, PlainObject, Omit } from 'simplytyped';
import * as Ajv from 'ajv';

// Schema definitions
import { Schema, SchemaMetaData } from 'type-level-schema/schema';
import { StringSchema } from 'type-level-schema/defs/string';
import { NumberSchema } from 'type-level-schema/defs/number';
import { BooleanSchema } from 'type-level-schema/defs/boolean';
import { ArraySchema } from 'type-level-schema/defs/array';
import { ObjectSchema } from 'type-level-schema/defs/object';

/**
 * no-doc - Gets the full schema definition for a given type.
 */
export type TypeToSchema<T> =
    T extends string ? StringSchema :
    T extends number ? NumberSchema :
    T extends boolean ? BooleanSchema :
    T extends any[] ? ArraySchema :
    T extends object ? ObjectSchema :
        never;

/**
 * no-doc - Gets the optional parts of the schema definition for a given type.
 */
export type TypeToSchemaOptions<T> = Omit<TypeToSchema<T>, 'type'>;

/**
 * no-doc - Generates an object type from `[string, Validator]` pairs
 * @param O a Validator record
 * @returns a record with keys of `O` pointing to the `ValidType` of that key
 */
export type ObjectValidator<O extends Record<string, Validator<any>>> = {
    [S in keyof O]: ValidType<O[S]>;
};

/**
 * no-doc - Generates an object type from `[string, Validator]` pairs, marking specified keys as optional
 * @param O a Validator record
 * @param OptionalKeys a union of keys that should be marked optional
 */
export type OptionalObjectValidator<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O> = Optional<ObjectValidator<O>, OptionalKeys>;

/**
 * no-doc - Specify the optional parameters for `object` function
 * @param OptionalKeys a union of strings for keys that should be marked optional
 */
export type ObjectOptions<OptionalKeys> = Partial<{
    optional: OptionalKeys[];
}>;

/**
 * Specifies the shape of a successful validation using the `validate` method.
 * Discriminated on the `valid` key.
 * @param T the type associated with a valid result according to the current Validator instance. Equal to `T` in the `Validator<T>` type.
 * @example
 * ```typescript
 * const x: ValidResult<string> = {
 *   data: 'some string',
 *   valid: true,
 * }
 * ```
 */
export interface ValidResult<T> {
    data: T;
    valid: true;
}

/**
 * Specifies the shape of a failed validation using the `validate` method.
 * Discriminated on the `valid` key.
 */
export interface InvalidResult {
    errors: Ajv.ErrorObject[];
    valid: false;
}

/**
 * no-doc - Runs a function exactly once, and caches the result.
 * @param f Some function that should only be run once.
 */
const once = <F extends AnyFunc>(f: F): F => {
    let ret: any;
    let called = false;
    return ((...args: any[]) => {
        if (!called) {
            ret = f(...args);
            called = true;
            return ret;
        }

        return ret;
    }) as any;
};

/**
 * A `Validator<T>` instance is an encapsulated pair of some TS type `T` and a corresponding JSON schema.
 *
 * A `Validator` already knows how to map from `T` to its json schema: using a json schema validator.
 * Additionally, a `Validator` can perform simple algebraic operations with other `Validator`s resulting in more complex validatable types.
 *
 * A `Validator` will always maintain a valid json schema representation of the type, `T`, that it encapsulates.
 * The underlying json schema can always be accessed with `getSchema()`.
 *
 * @example
 * ```typescript
 * const stringValidator = new Validator<string>({ type: 'string' });
 * const numberValidator = new Validator<number>({ type: 'number' });
 * const strOrNum = new Validator<string | number>({ oneOf: [ { type: 'string' }, { type: 'number' } ]});
 * const strOrNum2 = stringValidator.or(numberValidator);
 * ```
 */
export class Validator<T> {
    constructor(private schema: Schema) {}

    private getAjv = once(() => new Ajv());
    private getCompiledSchema = once(() => {
        const ajv = this.getAjv();
        const schema = this.getSchema();
        return ajv.compile(schema);
    });

    /**
     * Returns the underlying JSON schema.
     * @returns a JSON schema object
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const schema = v.string().getSchema();
     * console.log(schema); // { type: 'string' }
     * ```
     */
    getSchema(): Schema {
        return this.schema;
    }

    /**
     * Predicate returning `true` if the given data matches the JSON schema.
     * Acts as a type guard for the encapsulated typescript type.
     * @param thing Any data of unknown type which will be validated.
     * @returns a boolean indicating validity of given thing.
     *
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const userIdModel = v.nominal(v.string(), 'userId');
     * const userModel = v.object({ name: v.string(), id: userIdModel });
     *
     * const x: any = getUserData();
     * if (userModel.isValid(x)) doThing(x);
     * ```
     */
    isValid(thing: unknown): thing is T {
        const ajvValidator = this.getCompiledSchema();

        return ajvValidator(thing) as boolean;
    }

    /**
     * Takes data of unknown type and returns a discriminated union with either the data as the valid type,
     * or an error object describing what part of the data did not match.
     * @param data Any data of unknown type which will be validated.
     *
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const stringModel = v.string();
     *
     * const result = stringModel.validate(22);
     * if (result.valid) doThing(result.data);
     * else logger.error(...result.errors);
     * ```
     */
    validate(data: unknown): ValidResult<T> | InvalidResult {
        if (this.isValid(data)) {
            return { data, valid: true };
        }

        const ajvValidator = this.getCompiledSchema();
        return { errors: ajvValidator.errors || [], valid: false };
    }

    /**
     * Add meta-data to the underlying JSON schema.
     * This is entirely un-observable information to the validator,
     * but supplies the `getSchema` method to have a complete JSON schema with meta-data annotations.
     * @param meta JSON schema meta-data (name, description, etc.)
     *
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const validator = v.string();
     * validator.setSchemaMetaData({ name: 'string validator' });
     * ```
     */
    setSchemaMetaData(meta: Partial<SchemaMetaData>): this {
        this.schema = {
            ...this.schema,
            ...meta,
        };
        return this;
    }

    /**
     * Add additional validations to the generated schema.
     * While most of these validations are not representable at compile time
     * with typescript (`minLength` of a `string` for instance), it can be helpful
     * to have the additional validations when validating runtime types.
     * @param opts JSON schema specific options (for instance: `{ maxLength: 2, minLength: 0 }`)
     *
     * @example
     * ```typescript
     * const validator = v.string().withOptions({ minLength: 1 });
     * validator.isValid(''); // false
     * validator.isValid('hi'); // true
     * ```
     */
    withOptions(opts: TypeToSchemaOptions<T>): this {
        this.schema = {
            ...this.schema,
            ...opts as any,
        };
        return this;
    }

    /**
     * Creates a new validator that is true whenever the data matches `this` _or_ `v`.
     * @param other Another validator instance whose type will form a union with `this` encapsulated type.
     *
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const or = v.string().or(v.number()).or(v.boolean()); // string | number | boolean
     * ```
     */
    or<V extends Validator<any>>(other: V): Validator<T | ValidType<V>> {
        return union([this, other]);
    }

    /**
     * Creates a new validator that is true whenever the data matches `this` _and_ `v`.
     * @param other Another validator instance whose type will form an intersection with `this` encapsulated type.
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const v1 = v.object({ a: v.string() });
     * const v2 = v.object({ b: v.number() });
     * const v3 = v.object({ c: v.boolean() });
     *
     * const and = v1.and(v2).and(v3); // { a: string, b: number, c: boolean }
     * ```
     */
    and<V extends Validator<any>>(other: V): Validator<T & ValidType<V>> {
        return intersect(this, other);
    }

    /**
     * Shortcut for `.or(v.nil())` creating a nullable version of this schema.
     *
     * @example
     * ```typescript
     * import * as v from 'validtyped';
     *
     * const nullableString = v.string().orNull();
     * ```
     */
    orNull(): Validator<T | null> {
        return this.or(nil());
    }
}

/**
 * Creates a validator instance that is true when the given type is a string.
 * @param union [optional] an array of possible string literals that the valid data could take.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.string();
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data => `string`
 * else throw new Error('oops!'); // typeof data => `any`
 * ```
 */
export function string(): Validator<string>;
export function string<S extends string>(union?: S[]): Validator<S>;
export function string(union?: string[]) {
    const e = union ? { enum: union } : {};
    return new Validator({ type: 'string', ...e });
}

/**
 * Creates a validator instance that is true when the given type is a number.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.number();
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data => `number`
 * else throw new Error('oops!'); // typeof data => `any`
 * ```
 */
export function number(): Validator<number> {
    return new Validator({ type: 'number' });
}

/**
 * Creates a validator instance that is true when the given type is a boolean.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.boolean();
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data => `boolean`
 * else throw new Error('oops!'); // typeof data => `any`
 * ```
 */
export function boolean(): Validator<boolean> {
    return new Validator({ type: 'boolean' });
}

/**
 * Creates a validator instance that is _always_ true.
 * This is useful for specifying that an object _must_ have a given parameter, but you don't care what type that parameter is.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const data: any = getData();
 *
 * const validator = v.object({ a: v.string(), b: v.any() });
 *
 * if (validator.isValid(data)) doThing(data); // typeof data => `{ a: string, b: any }`
 * else throw new Error('oops!'); // typeof data => `any`
 * ```
 */
export function any(): Validator<any> {
    return new Validator({});
}

/**
 * Creates a validator instance that is true when given `null`.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const data : any = getData();
 *
 * const validator = v.nil();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data => `null`
 * else throw new Error('oops!'); // typeof data => `any`
 * ```
 */
export function nil(): Validator<null> {
    return new Validator({ type: 'null' });
}

/**
 * Creates a validator instance that passes type checking through to the given validator.
 * Operates as an identity function for the runtime `Validator` type, but annotates the compile-time encapsulated `Validator<T>`
 * with a nominal string.
 *
 * This is useful for marking `id`s or other fields as being a _specific_ type that should not be edited.
 *
 * @param v The validator instance that will be passed through for checking runtime correctness.
 * @param s The nominal type tag for compile-time types.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.nominal(v.string(), 'id');
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data => `Nominal<string, 'id'>`
 * else throw new Error('oops!'); // typeof data => `any`
 *
 * const id = 'user-id' as Nominal<string, 'id'>;
 * const newId = id + '-new'; // typeof data => `string`. Since we've modified this type, it can no longer be an `id`.
 * ```
 */
export function nominal<T, S extends string>(v: Validator<T>, s: S): Validator<Nominal<T, S>> {
    return new Validator(v.getSchema());
}

/**
 * Creates a validator instance that validates the given data is an object, and every property of that object matches the given schemas.
 * By default, all listed properties **are required**.
 * By default, unlisted properties are also allowed.
 *
 * @param o An object whose keys will be required keys of the valid type and whose properties are `Validator` instances matching the valid property's types.
 * @param opts [optional] An options object
 * @param opts.optional [optional] A list of keys that should be marked as optional in the valid type.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.object({ a: v.string(), b: v.number() });
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data = `{ a: string, b: number }`;
 * else throw new Error('oops!'); // typeof data = `any`
 * ```
 */
export function object<O extends Record<string, Validator<any>>>(o: O): Validator<ObjectValidator<O>>;
export function object<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O = never>(o: O, opts?: ObjectOptions<OptionalKeys>): Validator<OptionalObjectValidator<O, OptionalKeys>>;
export function object<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O = never>(o: O, opts?: ObjectOptions<OptionalKeys>) {
    const options: AllRequired<ObjectOptions<OptionalKeys>> = {
        optional: [] as OptionalKeys[],
        ...opts,
    };


    const properties = objectKeys(o).reduce((coll, key) => {
        coll[key] = o[key].getSchema();
        return coll;
    }, {} as Record<keyof O, Schema>);

    const required = Object.keys(o).filter(key => !options.optional.includes(key as OptionalKeys));

    return new Validator({
        type: 'object',
        properties,
        required,
    });
}

/**
 * Creates a `Validator` instance that matches on objects with _any_ keys, and whose properties match the given `Validator`.
 *
 * This is useful for "dictionary"-like objects, for instance a record of users by userId.
 *
 * @param types A `Validator` instance that specifies the right-side types of the record.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.record( v.number() );
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data = `Record<string, number>`;
 * else throw new Error('oops!'); // typeof data = `any`
 * ```
 */
export function record<T>(types: Validator<T>) {
    return new Validator<Record<string, T>>({
        type: 'object',
        additionalProperties: types.getSchema(),
    });
}

/**
 * Creates a `Validator` instance that matches on objects with no required keys, but mandated types for certain keys if they _do_ exist.
 *
 * @param v A `Validator` instance that specifies an object type.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.partial( v.object({
 *   a: v.string(),
 *   b: v.number(),
 * }));
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data = `{ a?: string, b?: number }`;
 * else throw new Error('oops!'); // typeof data = `any`
 * ```
 */
export function partial<T extends PlainObject>(v: Validator<T>): Validator<Partial<T>> {
    const schema = v.getSchema();
    if (!('type' in schema)) throw new Error('Must apply partial only to a type definition');
    if (schema.type !== 'object') throw new Error('Must only apply partial to an object schema');
    return new Validator({
        ...schema,
        required: [],
    });
}


/**
 * Creates a `Validator` instance that matches on arrays of the given type.
 *
 * @param v A `Validator` instance that specifies the shape of the array elements.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.array( v.number() );
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data = `number[]`;
 * else throw new Error('oops!'); // typeof data = `any`
 * ```
 */
export function array<T>(v: Validator<T>) {
    return new Validator<T[]>({
        type: 'array',
        items: [ v.getSchema() ],
        additionalItems: true,
    });
}

/**
 * Creates a `Validator` instance that matches on any one of the given list of possible types.
 *
 * @param v A list of `Validator` instances that specify the possible types that the valid type could take.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.union([ v.string(), v.number() ]);
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data = `number | string`
 * else throw new Error('oops!'); // typeof data = `any`
 * ```
 */
export function union<V extends Validator<any>>(v: V[]) {
    return new Validator<ValidType<V>>({
        oneOf: v.map(x => x.getSchema()),
    });
}

/**
 * Creates a `Validator` instance that matches on _both_ of the given possible types.
 *
 * @param v1 A `Validator` instance that the specified type must match.
 * @param v2 A `Validator` instance that the specified type must match.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.intersect( v.object({ a: v.string() }), v.object({ b: v.number() }) );
 * const data: any = getData();
 *
 * if (validator.isValid(data)) doThing(data); // typeof data = `{ a: string, b: number }`
 * else throw new Error('oops!'); // typeof data = `any`
 * ```
 */
export function intersect<T1, T2>(v1: Validator<T1>, v2: Validator<T2>) {
    return new Validator<T1 & T2>({ allOf: [v1.getSchema(), v2.getSchema()] });
}

/**
 * Returns the encapsulated type of a `Validator` type.
 *
 * @example
 * ```typescript
 * import * as v from 'validtyped';
 *
 * const validator = v.string();
 *
 * type x = v.ValidType<typeof validator>; // `string`
 * ```
 */
export type ValidType<V extends Validator<any>> = V extends Validator<infer T> ? T : never;
