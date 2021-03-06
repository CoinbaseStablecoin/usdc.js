export function eventID(name: string, types: string[]): Buffer;
export function methodID(name: string, types: string[]): Buffer;
export function rawEncode<Values extends any[] = any[]>(
  types: string[],
  values: Values
): Buffer;
export function rawDecode<Values extends any[] = any[]>(
  types: string[],
  data: Buffer
): Values;
export function simpleEncode<Args extends any[] = any[]>(
  method: string,
  ...args: Args
): Buffer;
export function simpleDecode<Args extends any[] = any[]>(
  method: string,
  data: Buffer
): Args;
export function stringify<Values extends any[] = any[]>(
  types: string[],
  values: Values
): string;
export function solidityHexValue<Value = any>(
  type: string,
  value: Value,
  bitsize: number | null
): Buffer;
export function soliditySHA3<Values extends any[] = any[]>(
  types: string[],
  values: Values
): Buffer;
export function solidityPack<Values extends any[] = any[]>(
  types: string[],
  values: Values
): Buffer;
export function fromSerpent(sig: string): string[];
export function toSerpent(types: string[]): string;
