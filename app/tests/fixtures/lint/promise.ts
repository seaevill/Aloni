// Fixture: floating promises are errors.
export async function work(): Promise<void> {}
export function caller() {
  work(); // @red @typescript-eslint/no-floating-promises
}
