import { Schema } from 'type-level-schema/schema';
import { objectKeys, Nominal, AnyFunc, AllRequired, Optional } from 'simplytyped';
import * as Ajv from 'ajv';

type ObjectValidator<O extends Record<string, Validator<any>>, OptionalKeys extends keyof O> = Optional<{
    [S in keyof O]: ValidType<O[S]>;
}, OptionalKeys>;

export type ObjectOptions<OptionalKeys> = Partial<{
    optional: OptionalKeys[];
}>;

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

    static nominal<T, S extends string>(v: Validator<T>, s: S): Validator<Nominal<T, S>> {
        return new Validator(v.getSchema());
    }

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

        return new Validator<ObjectValidator<O, OptionalKeys>>({
            type: 'object',
            properties,
            additionalProperties: false,
            required,
        });
    }

    static record<T>(types: Validator<T>) {
        return new Validator<Record<string, T>>({
            type: 'object',
            additionalProperties: types.getSchema(),
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

    private constructor(private schema: Schema) {}

    private getAjv = once(() => new Ajv());

    getSchema(): Schema {
        return this.schema;
    }

    isValid(thing: any): thing is T {
        const schema = this.getSchema();
        const ajv = this.getAjv();

        return ajv.validate(schema, thing) as boolean;
    }
}

export type ValidType<V extends Validator<any>> = V extends Validator<infer T> ? T : never;
