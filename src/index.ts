import { Schema } from 'type-level-schema/schema';
import { objectKeys, Nominal, AnyFunc } from 'simplytyped';
import * as Ajv from 'ajv';

type ObjectValidator<O extends Record<string, Validator<any>>> = {
    [S in keyof O]: O[S] extends Validator<infer T> ? T : any;
};

type UnionValidator<V extends Validator<any>> = V extends Validator<infer T> ? T : any;

const once = <F extends AnyFunc>(f: F): F => {
    let ret: any;
    return ((...args: any[]) => {
        if (ret === undefined) {
            ret = f(...args);
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

    static object<O extends Record<string, Validator<any>>>(o: O) {
        const properties = objectKeys(o).reduce((coll, key) => {
            coll[key as string] = o[key].getSchema();
            return coll;
        }, {} as Record<string, Schema>);

        return new Validator<ObjectValidator<O>>({
            type: 'object',
            properties,
            additionalProperties: false,
        });
    }

    static array<V extends Validator<any>>(v: V[]) {
        return new Validator<Array<UnionValidator<V>>>({
            type: 'array',
            items: v.map(x => x.getSchema()),
        });
    }

    static union<V extends Validator<any>>(v: V[]) {
        return new Validator<UnionValidator<V>>({
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
