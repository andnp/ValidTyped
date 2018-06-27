import { Schema, SchemaMetaData } from 'type-level-schema/schema';
import { objectKeys, Nominal, AnyFunc, AllRequired, Optional, Unknown } from 'simplytyped';
import * as Ajv from 'ajv';

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
 * A `Valdiator<T>` instance is an encapsulated pair of some TS type `T` and a corresponding JSON schema.
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
     */
    getSchema(): Schema {
        return this.schema;
    }

    /**
     * Predicate returning `true` if the given data matches the JSON schema.
     * Acts as a type guard for the encapsulated typescript type.
     * @param thing Any data of unknown type which will be validated.
     * @returns a boolean indicating validity of given thing.
     */
    isValid(thing: Unknown): thing is T {
        const ajvValidator = this.getCompiledSchema();

        return ajvValidator(thing) as boolean;
    }

    /**
     * Takes data of unknown type and returns a discriminated union with either the data as the valid type,
     * or an error object describing what part of the data did not match.
     * @param data Any data of unknown type which will be validated.
     */
    validate(data: Unknown): ValidResult<T> | InvalidResult {
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
     */
    setSchemaMetaData(meta: Partial<SchemaMetaData>): this {
        this.schema = {
            ...this.schema,
            ...meta,
        };
        return this;
    }

    /**
     * Creates a new validator that is true whenever the data matches `this` _or_ `v`.
     * @param v Another validator instance whose type will form a union with `this` encapsulated type.
     */
    or<V extends Validator<any>>(v: V): Validator<T | ValidType<V>> {
        return union([this, v]);
    }

    /**
     * Creates a new validator that is true whenever the data matches `this` _and_ `v`.
     * @param v Another validator instance whose type will form an intersection with `this` encapsulated type.
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
    and<V extends Validator<any>>(v: V): Validator<T & ValidType<V>> {
        return intersect(this, v);
    }
}

/**
 * Creates a validator instance that is true when the given type is a string.
 * @param union [optional] an array of possible string literals that the valid data could take.
 */
export function string(): Validator<string>;
export function string<S extends string>(union?: S[]): Validator<S>;
export function string(union?: string[]) {
    const e = union ? { enum: union } : {};
    return new Validator({ type: 'string', ...e });
}

export function number(): Validator<number> {
    return new Validator({ type: 'number' });
}

export function boolean(): Validator<boolean> {
    return new Validator({ type: 'boolean' });
}

export function any(): Validator<any> {
    return new Validator({});
}

export function nominal<T, S extends string>(v: Validator<T>, s: S): Validator<Nominal<T, S>> {
    return new Validator(v.getSchema());
}

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

export function record<T>(types: Validator<T>) {
    return new Validator<Record<string, T>>({
        type: 'object',
        additionalProperties: types.getSchema(),
    });
}

export function partial<T extends Record<string, any>>(v: Validator<T>): Validator<Partial<T>> {
    const schema = v.getSchema();
    if (!('type' in schema)) throw new Error('Must apply partial only to a type definition');
    if (schema.type !== 'object') throw new Error('Must only apply partial to an object schema');
    return new Validator({
        ...schema,
        required: [],
    });
}

export function array<T>(v: Validator<T>) {
    return new Validator<T[]>({
        type: 'array',
        items: v.map(x => x.getSchema()),
        additionalItems: true,
    });
}

export function union<V extends Validator<any>>(v: V[]) {
    return new Validator<ValidType<V>>({
        oneOf: v.map(x => x.getSchema()),
    });
}

export function intersect<T1, T2>(v1: Validator<T1>, v2: Validator<T2>) {
    return new Validator<T1 & T2>({ allOf: [v1.getSchema(), v2.getSchema()] });
}

export type ValidType<V extends Validator<any>> = V extends Validator<infer T> ? T : never;
