import { keccak256 } from "./hash";
import { bufferFromHexString, hexStringFromBuffer } from "./types";
import ABI from "../vendor/ethereumjs-abi";

/**
 * Derive a 4-byte function selector from a function signature
 * @param funcSig Function signature
 * @returns Function selector in hexadecimal string
 */
export function functionSelector(funcSig: string): string {
  return hexStringFromBuffer(
    keccak256(Buffer.from(funcSig, "utf8")).slice(0, 4)
  );
}

/**
 * Decode a single ABI-encoded value
 * @param type Type
 * @param data ABI-encoded value in hexadecimal string
 * @returns Decode value
 */
export function decodeABIValue<Value = any>(type: string, data: string): Value {
  return ABI.rawDecode<[Value]>([type], bufferFromHexString(data))[0];
}
