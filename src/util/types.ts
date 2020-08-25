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
 * @throws TypeError
 * @returns Given hexadecimal string
 */
export function ensureHexString(hex: string, varName?: string): string {
  if (!isHexString(hex)) {
    throw new TypeError(
      varName
        ? `${varName} is not a valid hexadecimal string`
        : "Invalid hexadecimal string"
    );
  }
  return hex;
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
  let h = strip0x(ensureHexString(hex, varName));
  if (h.length % 2 !== 0) {
    h = "0" + h;
  }
  return Buffer.from(h, "hex");
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
