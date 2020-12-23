import { JSONRPCError, JSONRPCResponse } from "./types";
import fetch from "isomorphic-unfetch";
import {
  functionSelector,
  encodeABIParameters,
  decodeABIValue,
  stringFromBlockHeight,
} from "../../util";
import BN from "bn.js";

const selectors = new Map<string, string>();

export class RPC {
  private _url: string;
  private __chainId?: number;

  /**
   * Constructor. Most users should use an instance of this class created by the
   * Wallet class.
   * @param url RPC URL (Default: blank)
   */
  public constructor(url = "") {
    this._url = url;
  }

  /**
   * RPC URL
   */
  public get url(): string {
    return this._url;
  }

  /**
   * Chain ID
   */
  public get chainId(): number | null {
    return this.__chainId ?? null;
  }

  /**
   * Set the JSON-RPC URL
   * @param url RPC URL
   */
  public setURL(url: string): void {
    this._url = url;
    this.__chainId = undefined;
  }

  /**
   * Call an Ethereum JSON-RPC method
   * @param method Method name
   * @param params Parameters
   * @throws JSONRPCError
   * @throws Error
   * @returns A promise that resolves to the result returned by the RPC
   */
  public async callMethod<Result = any, Params = any[]>(
    method: string,
    params: Params
  ): Promise<Result> {
    const response = await fetch(this._url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });

    let json: JSONRPCResponse<Result> | undefined;
    try {
      json = await response.json();
    } catch {
      // noop
    }

    const err = json?.error;
    if (err) {
      throw new JSONRPCError(err.message, err.code, err.data, response.status);
    }

    if (!response.ok) {
      throw new JSONRPCError(response.statusText, 0, null, response.status);
    }

    const result = json?.result;
    if (result === undefined) {
      throw new JSONRPCError("Result missing", 0, null, response.status);
    }

    return result;
  }

  /**
   * Get the chain ID
   * @returns A promise that resolves to the chain ID
   */
  public async getChainId(): Promise<number> {
    if (typeof this.__chainId !== "number") {
      const data = await this.callMethod<string>("eth_chainId", []);
      this.__chainId = decodeABIValue<BN>("uint32", data).toNumber();
    }
    return this.__chainId;
  }

  /**
   * Make a read-only Ethereum contract call
   * @param contractAddress Contract Address
   * @param funcSig Function signature (e.g. "transfer(address,uint256)")
   * @param types List of parameter types (e.g. ["uint256", "string"])
   * @param params List of parameter values (e.g. [1, "foo"])
   * @param returnType Return type (e.g. "uint256")
   * @param blockHeight Block height
   * @param memoizeSelector Memoize function selector to make future calls faster
   * @returns A promise that resolves to the result of the call
   */
  public async ethCall<Result = any, Params = any[]>(
    contractAddress: string,
    funcSig: string,
    types: string[],
    params: Params,
    returnType: string,
    blockHeight: number | "latest" | "pending" = "latest",
    memoizeSelector = false
  ): Promise<Result> {
    let sel = selectors.get(funcSig);
    if (!sel) {
      sel = functionSelector(funcSig);
      if (memoizeSelector) {
        selectors.set(funcSig, sel);
      }
    }

    const data = await this.callMethod<string>("eth_call", [
      {
        to: contractAddress,
        data: sel + encodeABIParameters(types, params).slice(2),
      },
      stringFromBlockHeight(blockHeight),
    ]);

    return decodeABIValue<Result>(returnType, data);
  }
}
