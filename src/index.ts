import { Schema, SchemaMetaData } from 'type-level-schema/schema';
import { objectKeys, Nominal, AnyFunc, AllRequired, Optional, Unknown } from 'simplytyped';
import * as Ajv from 'ajv';

type ObjectValidator<O extends Record<string, Validator<any>>> = {
    [S in keyof O]: ValidType<O[S]>;
};

type OptionalObjectValidator<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O> = Optional<ObjectValidator<O>, OptionalKeys>;

export type ObjectOptions<OptionalKeys> = Partial<{
    optional: OptionalKeys[];
}>;

export interface ValidResult<T> {
    data: T;
    valid: true;
}

export interface InvalidResult {
    errors: Ajv.ErrorObject[];
    valid: false;
}

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

export default class Validator<T> {
    static string(): Validator<string>;
    static string<S extends string>(union?: S[]): Validator<S>;
    static string(union?: string[]) {
        const e = union ? { enum: union } : {};
        return new Validator({ type: 'string', ...e });
    }

    static number(): Validator<number> {
        return new Validator({ type: 'number' });
    }

    static boolean(): Validator<boolean> {
        return new Validator({ type: 'boolean' });
    }

    static any(): Validator<any> {
        return new Validator({});
    }

    static nominal<T, S extends string>(v: Validator<T>, s: S): Validator<Nominal<T, S>> {
        return new Validator(v.getSchema());
    }

    static object<O extends Record<string, Validator<any>>>(o: O): Validator<ObjectValidator<O>>;
    static object<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O = never>(o: O, opts?: ObjectOptions<OptionalKeys>): Validator<OptionalObjectValidator<O, OptionalKeys>>;
    static object<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O = never>(o: O, opts?: ObjectOptions<OptionalKeys>) {
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

    static record<T>(types: Validator<T>) {
        return new Validator<Record<string, T>>({
            type: 'object',
            additionalProperties: types.getSchema(),
        });
    }

    static partial<T extends Record<string, any>>(v: Validator<T>): Validator<Partial<T>> {
        const schema = v.getSchema();
        if (!('type' in schema)) throw new Error('Must apply partial only to a type definition');
        if (schema.type !== 'object') throw new Error('Must only apply partial to an object schema');
        return new Validator({
            ...schema,
            required: [],
        });
    }

    static array<V extends Validator<any>>(v: V[]) {
        return new Validator<Array<ValidType<V>>>({
            type: 'array',
            items: v.map(x => x.getSchema()),
            additionalItems: true,
        });
    }

    static union<V extends Validator<any>>(v: V[]) {
        return new Validator<ValidType<V>>({
            oneOf: v.map(x => x.getSchema()),
        });
    }

    static intersect<T1, T2>(v1: Validator<T1>, v2: Validator<T2>) {
        return new Validator<T1 & T2>({ allOf: [v1.getSchema(), v2.getSchema()] });
    }

    private constructor(private schema: Schema) {}

    private getAjv = once(() => new Ajv());
    private getCompiledSchema = once(() => {
        const ajv = this.getAjv();
        const schema = this.getSchema();
        return ajv.compile(schema);
    });

    getSchema(): Schema {
        return this.schema;
    }

    isValid(thing: Unknown): thing is T {
        const ajvValidator = this.getCompiledSchema();

        return ajvValidator(thing) as boolean;
    }

    validate(data: Unknown): ValidResult<T> | InvalidResult {
        if (this.isValid(data)) {
            return { data, valid: true };
        }

        const ajvValidator = this.getCompiledSchema();
        return { errors: ajvValidator.errors || [], valid: false };
    }

    setSchemaMetaData(meta: Partial<SchemaMetaData>): this {
        this.schema = {
            ...this.schema,
            ...meta,
        };
        return this;
    }

    or<V extends Validator<any>>(v: V): Validator<T | ValidType<V>> {
        return Validator.union([this, v]);
    }

    and<V extends Validator<any>>(v: V): Validator<T & ValidType<V>> {
        return Validator.intersect(this, v);
    }
}

export type ValidType<V extends Validator<any>> = V extends Validator<infer T> ? T : never;
