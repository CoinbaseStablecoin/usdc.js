import createKeccakHash from "keccak";

/**
 * Perform keccak-256 hashing
 * @param data Pre-image data
 * @returns Keccak-256 hash digest
 */
export function keccak256(data: Buffer): Buffer {
  return createKeccakHash("keccak256").update(data).digest();
}
