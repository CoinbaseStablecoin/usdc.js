import { JSONRPCError, JSONRPCResponse } from "./types";
import fetch from "isomorphic-unfetch";

export class RPC {
  public constructor(public url = "") {}

  /**
   * Call an Ethereum JSON-RPC method
   * @param method Method name
   * @param params Parameters
   * @throws JSONRPCError
   * @throws Error
   * @returns Result
   */
  public async callMethod<Params = any[], Result = any>(
    method: string,
    params: Params
  ): Promise<Result> {
    const response = await fetch(this.url, {
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
}
