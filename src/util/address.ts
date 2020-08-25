import { EthereumAddress } from "wallet.ts";

export class InvalidAddressError extends Error {
  public constructor(public readonly address: unknown) {
    super("Invalid address");
    Object.setPrototypeOf(this, InvalidAddressError.prototype);
    this.name = "InvalidAddressError";
  }
}

/**
 * Checks the validity of an Ethereum address
 * @param address Ethereum address
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  if (typeof address !== "string") {
    return false;
  }
  return EthereumAddress.isValid(address);
}

/**
 * Converts the Ethereum address to a mixed-case checksum address (EIP-55)
 * @param address Ethereum address
 * @throws InvalidAddressError
 * @returns Checksum address
 */
export function checksumAddress(address: string): string {
  if (typeof address !== "string") {
    throw new InvalidAddressError(address);
  }
  let checksumAddress: string;
  try {
    checksumAddress = EthereumAddress.checksumAddress(address);
  } catch {
    throw new InvalidAddressError(address);
  }
  return checksumAddress;
}

/**
 * Checks the validity of an Ethereum address, returns a checksum address if
 * the address is valid, and throws otherwise
 * @param address Ethereum address
 * @throws InvalidAddressError
 * @returns Checksum address
 */
export function ensureValidAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new InvalidAddressError(address);
  }
  return checksumAddress(address);
}
