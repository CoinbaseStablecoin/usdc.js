import { EthereumAddress } from "wallet.ts";

/**
 * Checks the validity of an Ethereum address
 * @param address Ethereum address
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  return EthereumAddress.isValid(address);
}

/**
 * Converts the Ethereum address to a mixed-case checksum address (EIP-55)
 * @param address Ethereum address
 * @returns Checksum address
 */
export function checksumAddress(address: string): string {
  return EthereumAddress.checksumAddress(address);
}
