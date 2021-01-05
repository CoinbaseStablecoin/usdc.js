import { keccak256 } from "./hash";
import { bufferFromHexString, hexStringFromBuffer } from "./types";
import * as ABI from "../vendor/ethereumjs-abi";

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

/**
 * Encode a given list of parameters in the ABI format
 * @param types List of parameter types (e.g. ["uint256", "string"])
 * @param params List of parameter values (e.g. [1, "foo"])
 * @param addPrefix (Default: true) If true, prepends the string with "0x"
 * @returns Encoded value in hexadecimal string
 */
export function encodeABIParameters<Params extends any[] = any[]>(
  types: string[],
  params: Params,
  addPrefix = true
): string {
  return hexStringFromBuffer(ABI.rawEncode(types, params), addPrefix);
}
