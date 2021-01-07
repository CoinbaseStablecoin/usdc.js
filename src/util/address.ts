import { EthereumAddress } from "wallet.ts";

/**
 * Checks the validity of an Ethereum address
 * @param address Ethereum address
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }
  return EthereumAddress.isValid(address);
}

/**
 * Converts the Ethereum address to a mixed-case checksum address (EIP-55)
 * @param address Ethereum address
 * @throws TypeError
 * @returns Checksum address
 */
export function checksumAddress(address: string): string {
  let checksumAddress: string;
  try {
    checksumAddress = EthereumAddress.checksumAddress(address);
  } catch {
    throw new TypeError("Given value is not a valid address");
  }
  return checksumAddress;
}

/**
 * Checks the validity of an Ethereum address, returns a checksum address if
 * the address is valid, and throws otherwise
 * @param address Ethereum address
 * @param varName Variable name to include in the error message
 * @throws TypeError
 * @returns Checksum address
 */
export function ensureValidAddress(
  address: string,
  varName = "Given value"
): string {
  if (!isValidAddress(address)) {
    throw new TypeError(`${varName} is not a valid address`);
  }
  return checksumAddress(address);
}
