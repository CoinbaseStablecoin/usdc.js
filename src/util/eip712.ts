import { keccak256 } from "./hash";
import { bufferFromHexString } from "./types";
import * as ABI from "../vendor/ethereumjs-abi";

const typeHashes = new Map<string, Buffer>();

/**
 * Generate a keccak hash that conforms to the EIP-712 spec
 * @param domainSeparator Domain separator
 * @param typeSig Type signature that gets hashed to generate the type hash
 * @param types List of parameter types
 * @param params List of parameter values
 * @param memoizeTypeHash (Default: false) Memonize type hash to make repeated
 * calls more efficient
 * @returns A hash digest
 */
export function eip712Hash<Params extends any[] = any[]>(
  domainSeparator: string,
  typeSig: string,
  types: string[],
  params: Params,
  memoizeTypeHash = false
): Buffer {
  let typeHash = typeHashes.get(typeSig);
  if (!typeHash) {
    typeHash = keccak256(Buffer.from(typeSig, "utf8"));
    if (memoizeTypeHash) {
      typeHashes.set(typeSig, typeHash);
    }
  }

  return keccak256(
    Buffer.concat([
      Buffer.from("1901", "hex"),
      bufferFromHexString(domainSeparator),
      keccak256(ABI.rawEncode(["bytes32", ...types], [typeHash, ...params])),
    ])
  );
}
