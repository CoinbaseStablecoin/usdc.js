import createKeccakHash from "keccak";
import { bufferFromHexString } from "./types";

/**
 * Perform keccak-256 hashing
 * @param data Pre-image data as Buffer or a hexadecimal string
 * @returns Keccak-256 hash digest
 */
export function keccak256(data: Buffer | string): Buffer {
  const buf = typeof data === "string" ? bufferFromHexString(data) : data;
  return createKeccakHash("keccak256").update(buf).digest();
}
