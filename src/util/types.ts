import BN from "bn.js";

export const ONE_ETHER = new BN("1000000000000000000", 10);

/**
 * Checks whether a given string is a valid hexadecimal string
 * @param hex Hexadecimal string
 * @returns True if valid
 */
export function isHexString(hex: string): boolean {
  return /^(0x)?[a-fA-F0-9]*$/.test(hex);
}

/**
 * Returns a given string if it is a valid hexadecimal string, otherwise throws
 * a TypeError
 * @param hex Hexadecimal string
 * @param varName Variable name to include in the error message
 * @param addPrefix (Default: true) Adds prefix if true, strips if false
 * @param evenLength (Default: false) Always have even number of hex characters
 * @throws TypeError
 * @returns Given hexadecimal string
 */
export function ensureHexString(
  hex: string,
  varName?: string,
  addPrefix = true,
  evenLength = false
): string {
  let h = strip0x(hex);
  if (!isHexString(h)) {
    throw new TypeError(
      varName
        ? `${varName} is not a valid hexadecimal string`
        : "Invalid hexadecimal string"
    );
  }
  if (evenLength && h.length % 2 !== 0) {
    h = "0" + h;
  }
  return addPrefix ? prepend0x(h) : strip0x(h);
}

/**
 * Convert a Buffer object to a hexadecimal string
 * @param buf Buffer object
 * @param addPrefix (Default: true) If true, prepends the string with "0x"
 * @returns Hexadecimal string
 */
export function hexStringFromBuffer(buf: Buffer, addPrefix = true): string {
  const hex = buf.toString("hex");
  return addPrefix ? "0x" + hex : hex;
}

/**
 * Convert a hexadecimal string to a Buffer object. Throws a TypeError if an
 * invalid hexadecimal string is given
 * @param hex Hexadecimal string
 * @param varName Variable name to use in the error message
 * @returns Buffer object
 */
export function bufferFromHexString(hex: string, varName?: string): Buffer {
  return Buffer.from(ensureHexString(hex, varName, false, true), "hex");
}

/**
 * Convert a whole number to a Buffer object
 * @param num Number
 * @throws TypeError
 * @returns Buffer object
 */
export function bufferFromNumber(num: number): Buffer {
  const hex = hexStringFromNumber(num, false);
  return hex === "0" ? Buffer.alloc(0) : bufferFromHexString(hex);
}

/**
 * Convert a BN object to a Buffer object.
 * @param bn BN object
 * @throws TypeError
 * @returns Buffer object
 */
export function bufferFromBN(bn: BN): Buffer {
  const hex = hexStringFromBN(bn, false);
  return hex === "0" ? Buffer.alloc(0) : bufferFromHexString(hex);
}

/**
 * Convert a hexadecimal string to a number
 * @param hex Hexadecimal string
 * @throws RangeError
 * @returns Integer
 */
export function numberFromHexString(hex: string): number {
  const h = ensureHexString(hex, undefined, false);
  const num = Number.parseInt(h, 16);
  if (num > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Number too large");
  }
  return num;
}

/**
 * Convert a whole number to a hexadecimal string
 * @param num Number (integer)
 * @param addPrefix (Default: true) If true, prepends the string with "0x"
 * @returns Hexadecimal string
 */
export function hexStringFromNumber(num: number, addPrefix = true): string {
  if (!Number.isInteger(num)) {
    throw new TypeError("Number must be an integer");
  }
  const hex = num.toString(16);
  return addPrefix ? "0x" + hex : hex;
}

/**
 * Strip 0x prefix from a given string
 * @param str String
 * @returns String without 0x prefix
 */
export function strip0x(str: string): string {
  return str.replace(/^0x/, "");
}

/**
 * Add 0x prefix to a given string
 * @param str String
 * @returns String with 0x prefix
 */
export function prepend0x(str: string): string {
  return str.replace(/^(0x)?/, "0x");
}

/**
 * Convert a BN object to a hexadecimal string
 * @param bn BN object
 * @param addPrefix (Default: true) If true, prepends the string with "0x"
 * @returns Hexadecimal string
 */
export function hexStringFromBN(bn: BN, addPrefix = true): string {
  if (!BN.isBN(bn)) {
    throw new TypeError("Given value is not a BN object");
  }
  const hex = bn.toString(16);
  return addPrefix ? "0x" + hex : hex;
}

/**
 * Convert a BN object to a string representation of a positive decimal number
 * @param bn BN object
 * @param decimalPlaces Number of decimal places
 * @returns String representation of a positive decimal number
 */
export function decimalStringFromBN(bn: BN, decimalPlaces = 0): string {
  if (bn.isNeg()) {
    throw new Error("Number must be positive");
  }
  if (bn.isZero()) {
    return "0";
  }
  let str = bn.toString(10).padStart(decimalPlaces + 1, "0");
  if (decimalPlaces === 0) {
    return str;
  }

  str = str.slice(0, -decimalPlaces) + "." + str.slice(-decimalPlaces);
  str = str.replace(/\.0+$/, "");
  if (str.includes(".")) {
    str = str.replace(/0+$/, "");
  }
  return str;
}

/**
 * Convert a string representation of a positive decimal number to BN object
 * @param decimalNumber String representation of a positive decimal number
 * @param decimalPlaces Number of decimal places
 * @returns BN object
 * @throws Error
 */
export function bnFromDecimalString(
  decimalNumber: string,
  decimalPlaces = 0
): BN {
  ensurePositiveDecimalString(decimalNumber);

  let [whole, fractional] = decimalNumber.split(".");
  whole = whole || "0";
  fractional = (fractional || "0")
    .slice(0, decimalPlaces)
    .padEnd(decimalPlaces, "0");

  return new BN(whole + fractional, 10);
}

/**
 * Returns a given string if it contains a valid positive decimal number,
 * otherwise throws a TypeError
 * @param decimalNumber String representation of a positive decimal number
 * @throws TypeError
 * @returns Given string
 */
export function ensurePositiveDecimalString(decimalNumber: string): string {
  if (decimalNumber.startsWith("-")) {
    throw new TypeError("Number must be positive");
  }
  if (!decimalNumber || !/^\d*(\.\d*)?$/.test(decimalNumber)) {
    throw new TypeError("Invalid string representation of a decimal number");
  }
  return decimalNumber;
}

/**
 * Convert a block height to a valid string value
 * @param height block height
 * @returns A hexadecimal string, "latest" or "pending"
 */
export function stringFromBlockHeight(
  height: number | "latest" | "pending" = "latest"
): string {
  return typeof height === "number" ? hexStringFromNumber(height) : height;
}
