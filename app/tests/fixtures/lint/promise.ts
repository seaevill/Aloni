export async function work(): Promise<void> {}
export function caller() {
  work();
}
