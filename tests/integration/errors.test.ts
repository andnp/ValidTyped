import * as v from 'index';

test('Will get back array of errors on invalid data', () => {
    const validator = v.object({
        thing: v.string(),
    });

    const obj: any = { thing: 22 };

    const result = validator.validate(obj);
    if (result.valid) fail();
    else {
        expect(result.errors.length).toBe(1);
    }
});
