import fetch from "isomorphic-unfetch";
import { isValidAddress } from "../util";
import { JSONRPCError, JSONRPCResponse } from "./types";

enum ChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  KOVAN = 42,
  GOERLI = 5,
}

export const DEFAULT_USDC_CONTRACTS: Record<number, string | undefined> = {
  [ChainId.MAINNET]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [ChainId.ROPSTEN]: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
};

/**
 * An Ethereum network
 */
export class Network {
  /** Chain ID mapping */
  public static readonly ChainId = ChainId;
  /** Default network */
  public static default: Network | null = null;

  /**
   * Constructor
   * @param ethereumRPCEndpoint Ethereum RPC endpoint URL
   * @param chainId (Default: 1) Chain ID
   * @param usdcContractAddress (Default: null) USDC Contract Address
   */
  public constructor(
    public readonly ethereumRPCEndpoint: string,
    public readonly chainId = ChainId.MAINNET,
    public readonly usdcContractAddress: string | null = null
  ) {
    if (!usdcContractAddress) {
      usdcContractAddress = DEFAULT_USDC_CONTRACTS[chainId] || null;
    }
    if (usdcContractAddress && !isValidAddress(usdcContractAddress)) {
      throw new Error("Invalid USDC contract address");
    }
    this.usdcContractAddress = usdcContractAddress;
  }

  /**
   * Create a Network object and set it as the default
   * @param ethereumRPCEndpoint Ethereum RPC endpoint URL
   * @param chainId (Default: 1) Chain ID
   * @param usdcContractAddress (Default: null) USDC Contract Address
   * @returns Network object
   */
  public static setDefault(
    ethereumRPCEndpoint: string,
    chainId = 1,
    usdcContractAddress: string | null = null
  ): Network {
    return new Network(
      ethereumRPCEndpoint,
      chainId,
      usdcContractAddress
    ).setAsDefault();
  }

  /**
   * Set this object as the default network
   * @returns This
   */
  public setAsDefault(): Network {
    Network.default = this;
    return this;
  }

  /**
   * Call an Ethereum JSON-RPC method
   * @param method Method name
   * @param params Parameters
   * @throws JSONRPCError
   * @throws Error
   * @returns Result
   */
  public async callRPC<Params = any[], Result = any>(
    method: string,
    params: Params
  ): Promise<Result> {
    const response = await fetch(this.ethereumRPCEndpoint, {
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
