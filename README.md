# validtyped
[![Build Status](https://travis-ci.org/andnp/ValidTyped.svg?branch=master)](https://travis-ci.org/andnp/ValidTyped)

A runtime and compile-time type checker library.

---



### any

### array

### boolean

### intersect

### nominal

### number

### object

### partial

### record

### string
Creates a validator instance that is true when the given type is a string.

| Param | Description |
| --- | --- |
| union | [optional] an array of possible string literals that the valid data could take. |

### union

### Validator
A `Valdiator<T>` instance is an encapsulated pair of some TS type `T` and a corresponding JSON schema.

A `Validator` already knows how to map from `T` to its json schema: using a json schema validator.
Additionally, a `Validator` can perform simple algebraic operations with other `Validator`s resulting in more complex validatable types.

A `Validator` will always maintain a valid json schema representation of the type, `T`, that it encapsulates.
The underlying json schema can always be accessed with `getSchema()`.
#### Example
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
| v | Another validator instance whose type will form an intersection with `this` encapsulated type. |
#### Example
 ```typescript
import * as v from 'validtyped';

const v1 = v.object({ a: v.string() });
const v2 = v.object({ b: v.number() });
const v3 = v.object({ c: v.boolean() });

const and = v1.and(v2).and(v3); // { a: string, b: number, c: boolean }
```

### Validator.getSchema
Returns the underlying JSON schema.

### Validator.isValid
Predicate returning `true` if the given data matches the JSON schema.
Acts as a type guard for the encapsulated typescript type.

| Param | Description |
| --- | --- |
| thing | Any data of unknown type which will be validated. |

### Validator.or
Creates a new validator that is true whenever the data matches `this` _or_ `v`.

| Param | Description |
| --- | --- |
| v | Another validator instance whose type will form a union with `this` encapsulated type. |

### Validator.setSchemaMetaData
Add meta-data to the underlying JSON schema.
This is entirely un-observable information to the validator,
but supplies the `getSchema` method to have a complete JSON schema with meta-data annotations.

| Param | Description |
| --- | --- |
| meta | JSON schema meta-data (name, description, etc.) |

### Validator.validate
Takes data of unknown type and returns a discriminated union with either the data as the valid type,
or an error object describing what part of the data did not match.

| Param | Description |
| --- | --- |
| data | Any data of unknown type which will be validated. |

### ValidType

