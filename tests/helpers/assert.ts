export const pass = () => expect(true).toBe(true);
export const fail = () => expect(true).toBe(false);
export const assertTypesEqual = <T, U extends T>() => pass();
