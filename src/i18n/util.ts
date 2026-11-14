export type Vars = Record<string, string | number>;
export type Entry = string | ((vars: Vars) => string);
export type Dict = Record<string, Entry>;

/** English plural for dictionary entries: plural(3, 'day') → "3 days". */
export function plural(n: number | string, one: string, many = `${one}s`): string {
  return `${n} ${Number(n) === 1 ? one : many}`;
}
