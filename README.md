# validtyped
[![Build Status](https://travis-ci.org/andnp/ValidTyped.svg?branch=master)](https://travis-ci.org/andnp/ValidTyped)
[![Greenkeeper badge](https://badges.greenkeeper.io/andnp/ValidTyped.svg)](https://greenkeeper.io/)

A runtime and compile-time type checker library.

## Simple Example

```typescript
import * as v from 'validtyped';

const data: any = /*... some data of unknown type */ {};

const mySchema = v.object({
    a: v.string(['one', 'two', 'three']),
    b: v.number(),
    c: v.object({
        d: v.array(v.number())
    }),
});

if (mySchema.isValid(data)) {
    // these are typesafe operations
    data.a.match(/.*/);
    data.c.d.map(x => x * 2);

    // this is not valid at compile-time
    data.e + 1;
}

```

## Why?

At the boundaries of any typescript application, assumptions have to be made about what the expected types are.
In any scenario when making api calls, an application must either trust that the correct data will be returned or must validate the data given to it.

To maintain these assumptions with TS would require code like:
```typescript
const schema = {
    type: 'object',
    properties: {
        a: { type: 'string' },
        b: { type: 'number' },
    }
}

interface Thing {
    a: string;
    b: number;
}
```

While this is totally reasonable code, it requires specifying the shape of every object twice.

Because JSON Schema is such a commonly used standard, many amazing JSON Schema validators exist on npm.
Instead of building yet another validator to compete with these, `validtyped` makes use of `ajv` for the underlying validation logic.
As such, this project is simply a thin wrapper over `ajv` to bring compile-time typescript types, and run-time JSON Schema types together:
```typescript
import * as v from 'validtyped';

const schema = v.object({
    a: v.string(),
    b: v.number(),
});

type Thing = v.ValidType<typeof schema>;
```

## Api Docs

### any
Creates a validator instance that is _always_ true.
This is useful for specifying that an object _must_ have a given parameter, but you don't care what type that parameter is.
###### Example:
 ```typescript
import * as v from 'validtyped';

const data: any = getData();

const validator = v.object({ a: v.string(), b: v.any() });

if (validator.isValid(data)) doThing(data); // typeof data => `{ a: string, b: any }`
else throw new Error('oops!'); // typeof data => `any`
```

### array
Creates a `Validator` instance that matches on arrays of the given type.

| Param | Description |
| --- | --- |
| v | A `Validator` instance that specifies the shape of the array elements. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.array( v.number() );
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data = `number[]`;
else throw new Error('oops!'); // typeof data = `any`
```

### boolean
Creates a validator instance that is true when the given type is a boolean.
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.boolean();
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data => `boolean`
else throw new Error('oops!'); // typeof data => `any`
```

### intersect
Creates a `Validator` instance that matches on _both_ of the given possible types.

| Param | Description |
| --- | --- |
| v1 | A `Validator` instance that the specified type must match. |
| v2 | A `Validator` instance that the specified type must match. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.intersect( v.object({ a: v.string() }), v.object({ b: v.number() }) );
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data = `{ a: string, b: number }`
else throw new Error('oops!'); // typeof data = `any`
```

### nil
Creates a validator instance that is true when given `null`.
###### Example:
 ```typescript
import * as v from 'validtyped';

const data : any = getData();

const validator = v.nil();

if (validator.isValid(data)) doThing(data); // typeof data => `null`
else throw new Error('oops!'); // typeof data => `any`
```

### nominal
Creates a validator instance that passes type checking through to the given validator.
Operates as an identity function for the runtime `Validator` type, but annotates the compile-time encapsulated `Validator<T>`
with a nominal string.

This is useful for marking `id`s or other fields as being a _specific_ type that should not be edited.

| Param | Description |
| --- | --- |
| v | The validator instance that will be passed through for checking runtime correctness. |
| s | The nominal type tag for compile-time types. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.nominal(v.string(), 'id');
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data => `Nominal<string, 'id'>`
else throw new Error('oops!'); // typeof data => `any`

const id = 'user-id' as Nominal<string, 'id'>;
const newId = id + '-new'; // typeof data => `string`. Since we've modified this type, it can no longer be an `id`.
```

### number
Creates a validator instance that is true when the given type is a number.
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.number();
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data => `number`
else throw new Error('oops!'); // typeof data => `any`
```

### object
Creates a validator instance that validates the given data is an object, and every property of that object matches the given schemas.
By default, all listed properties **are required**.
By default, unlisted properties are also allowed.

| Param | Description |
| --- | --- |
| o | An object whose keys will be required keys of the valid type and whose properties are `Validator` instances matching the valid property's types. |
| opts | [optional] An options object |
| opts.optional | [optional] A list of keys that should be marked as optional in the valid type. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.object({ a: v.string(), b: v.number() });
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data = `{ a: string, b: number }`;
else throw new Error('oops!'); // typeof data = `any`
```

### partial
Creates a `Validator` instance that matches on objects with no required keys, but mandated types for certain keys if they _do_ exist.

| Param | Description |
| --- | --- |
| v | A `Validator` instance that specifies an object type. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.partial( v.object({
  a: v.string(),
  b: v.number(),
}));
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data = `{ a?: string, b?: number }`;
else throw new Error('oops!'); // typeof data = `any`
```

### record
Creates a `Validator` instance that matches on objects with _any_ keys, and whose properties match the given `Validator`.

This is useful for "dictionary"-like objects, for instance a record of users by userId.

| Param | Description |
| --- | --- |
| types | A `Validator` instance that specifies the right-side types of the record. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.record( v.number() );
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data = `Record<string, number>`;
else throw new Error('oops!'); // typeof data = `any`
```

### string
Creates a validator instance that is true when the given type is a string.

| Param | Description |
| --- | --- |
| union | [optional] an array of possible string literals that the valid data could take. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.string();
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data => `string`
else throw new Error('oops!'); // typeof data => `any`
```

### union
Creates a `Validator` instance that matches on any one of the given list of possible types.

| Param | Description |
| --- | --- |
| v | A list of `Validator` instances that specify the possible types that the valid type could take. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.union([ v.string(), v.number() ]);
const data: any = getData();

if (validator.isValid(data)) doThing(data); // typeof data = `number | string`
else throw new Error('oops!'); // typeof data = `any`
```

### Validator
A `Validator<T>` instance is an encapsulated pair of some TS type `T` and a corresponding JSON schema.

A `Validator` already knows how to map from `T` to its json schema: using a json schema validator.
Additionally, a `Validator` can perform simple algebraic operations with other `Validator`s resulting in more complex validatable types.

A `Validator` will always maintain a valid json schema representation of the type, `T`, that it encapsulates.
The underlying json schema can always be accessed with `getSchema()`.
###### Example:
 ```typescript
const stringValidator = new Validator<string>({ type: 'string' });
const numberValidator = new Validator<number>({ type: 'number' });
const strOrNum = new Validator<string | number>({ oneOf: [ { type: 'string' }, { type: 'number' } ]});
const strOrNum2 = stringValidator.or(numberValidator);
```

### Validator.and
Creates a new validator that is true whenever the data matches `this` _and_ `v`.

| Param | Description |
| --- | --- |
| other | Another validator instance whose type will form an intersection with `this` encapsulated type. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const v1 = v.object({ a: v.string() });
const v2 = v.object({ b: v.number() });
const v3 = v.object({ c: v.boolean() });

const and = v1.and(v2).and(v3); // { a: string, b: number, c: boolean }
```

### Validator.getSchema
Returns the underlying JSON schema.
###### Example:
 ```typescript
import * as v from 'validtyped';

const schema = v.string().getSchema();
console.log(schema); // { type: 'string' }
```

### Validator.isValid
Predicate returning `true` if the given data matches the JSON schema.
Acts as a type guard for the encapsulated typescript type.

| Param | Description |
| --- | --- |
| thing | Any data of unknown type which will be validated. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const userIdModel = v.nominal(v.string(), 'userId');
const userModel = v.object({ name: v.string(), id: userIdModel });

const x: any = getUserData();
if (userModel.isValid(x)) doThing(x);
```

### Validator.or
Creates a new validator that is true whenever the data matches `this` _or_ `v`.

| Param | Description |
| --- | --- |
| other | Another validator instance whose type will form a union with `this` encapsulated type. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const or = v.string().or(v.number()).or(v.boolean()); // string | number | boolean
```

### Validator.orNull
Shortcut for `.or(v.nil())` creating a nullable version of this schema.
###### Example:
 ```typescript
import * as v from 'validtyped';

const nullableString = v.string().orNull();
```

### Validator.setSchemaMetaData
Add meta-data to the underlying JSON schema.
This is entirely un-observable information to the validator,
but supplies the `getSchema` method to have a complete JSON schema with meta-data annotations.

| Param | Description |
| --- | --- |
| meta | JSON schema meta-data (name, description, etc.) |
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.string();
validator.setSchemaMetaData({ name: 'string validator' });
```

### Validator.validate
Takes data of unknown type and returns a discriminated union with either the data as the valid type,
or an error object describing what part of the data did not match.

| Param | Description |
| --- | --- |
| data | Any data of unknown type which will be validated. |
###### Example:
 ```typescript
import * as v from 'validtyped';

const stringModel = v.string();

const result = stringModel.validate(22);
if (result.valid) doThing(result.data);
else logger.error(...result.errors);
```

### Validator.withOptions
Add additional validations to the generated schema.
While most of these validations are not representable at compile time
with typescript (`minLength` of a `string` for instance), it can be helpful
to have the additional validations when validating runtime types.

| Param | Description |
| --- | --- |
| opts | JSON schema specific options (for instance: `{ maxLength: 2, minLength: 0 }`) |
###### Example:
 ```typescript
const validator = v.string().withOptions({ minLength: 1 });
validator.isValid(''); // false
validator.isValid('hi'); // true
```

### ValidType
Returns the encapsulated type of a `Validator` type.
###### Example:
 ```typescript
import * as v from 'validtyped';

const validator = v.string();

type x = v.ValidType<typeof validator>; // `string`
```

