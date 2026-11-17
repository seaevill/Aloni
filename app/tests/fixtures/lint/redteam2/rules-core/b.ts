export const sprayWindow = { from: 1, to: 2 };
const window = sprayWindow; // @ok
export const w1 = window.to - window.from; // @ok
export const w2 = (global: number) => global + 1; // @ok
export const w3 = (self: { x: number }) => self.x; // @ok
export const w4 = ({ performance }: { performance: number }) => performance; // @ok
export const w5 = (process: number) => process + 1; // @ok
