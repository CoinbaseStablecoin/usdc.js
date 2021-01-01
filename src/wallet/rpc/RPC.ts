import {
  JSONRPCError,
  JSONRPCResponse,
  TransactionReceipt,
  TimeoutError,
} from "./types";
import fetch from "isomorphic-unfetch";
import {
  functionSelector,
  encodeABIParameters,
  decodeABIValue,
  stringFromBlockHeight,
  ensureValidAddress,
  numberFromHexString,
  ensureHexString,
  checksumAddress,
  sleep,
} from "../../util";
import BN from "bn.js";

const selectors = new Map<string, string>();

export class RPC {
  private _url: string;
  private __chainId?: number;

  /**
   * Constructor. Most users should use an instance of this class created by the
   * Wallet class.
   * @param url (Default: blank) RPC URL
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
        data: sel + encodeABIParameters(types, params, false),
      },
      stringFromBlockHeight(blockHeight),
    ]);

    return decodeABIValue<Result>(returnType, data);
  }

  /**
   * Get the number of confirmed transactions sent from an address
   * @param address Address
   * @param blockHeight (Default: "latest") Block height
   * @returns A promise object that resolves to the number of transactions
   */
  public async getTransactionCount(
    address: string,
    blockHeight: number | "latest" | "pending" = "latest"
  ): Promise<number> {
    ensureValidAddress(address);

    const count = await this.callMethod("eth_getTransactionCount", [
      address,
      stringFromBlockHeight(blockHeight),
    ]);

    return numberFromHexString(count);
  }

  /**
   * Get the current gas price
   * @returns Gas price in wei
   */
  public async getGasPrice(): Promise<number> {
    const result = await this.callMethod("eth_gasPrice", []);
    return numberFromHexString(result);
  }

  /**
   * Get the receipt for a given transaction
   * @param txHash Transaction hash
   * @returns A promise that resolves to a TransactionReceipt object or null if
   * it is not available
   */
  public async getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | null> {
    ensureHexString(txHash);
    if (txHash.length !== 66) {
      throw new Error("Transaction hash must be 32 bytes long");
    }

    const r = await this.callMethod<{
      blockHash: string;
      blockNumber: string;
      contractAddress: string | null;
      cumulativeGasUsed: string;
      from: string;
      gasUsed: string;
      logs: {
        address: string;
        blockHash: string;
        blockNumber: string;
        data: string;
        logIndex: string;
        removed: boolean;
        topics: string[];
        transactionHash: string;
        transactionIndex: string;
      }[];
      logsBloom: string;
      status: string;
      to: string | null;
      transactionHash: string;
      transactionIndex: string;
    } | null>("eth_getTransactionReceipt", [txHash]);

    return r
      ? {
          transactionHash: r.transactionHash,
          transactionIndex: numberFromHexString(r.transactionIndex),
          blockNumber: numberFromHexString(r.blockNumber),
          blockHash: r.blockHash,
          from: checksumAddress(r.from),
          to: r.to ? checksumAddress(r.to) : null,
          cumulativeGasUsed: numberFromHexString(r.cumulativeGasUsed),
          gasUsed: numberFromHexString(r.gasUsed),
          contractAddress: r.contractAddress
            ? checksumAddress(r.contractAddress)
            : null,
          logs: r.logs.map((log) => ({
            logIndex: numberFromHexString(log.logIndex),
            address: checksumAddress(log.address),
            data: log.data,
            topics: log.topics,
          })),
          logsBloom: r.logsBloom,
          status: r.status === "0x1",
        }
      : null;
  }

  /**
   * Poll for the transaction receipt
   * @param transactionHash Transaction hash
   * @param ignoreError (Default: true) Ignore any errors encountered while
   * polling
   * @param pollingInterval (Default: 5) Polling interval in seconds
   * @param timeout (Default: 0) Timeout in seconds. No timeout if zero.
   * @throws TimeoutError
   * @returns A promise that resolves to a TransactionReceipt object
   */
  public async waitForReceipt(
    txHash: string,
    ignoreError = true,
    pollingInterval = 5,
    timeout = 0
  ): Promise<TransactionReceipt> {
    if (pollingInterval < 0) {
      throw new Error("pollingInterval must not be a negative number");
    }
    if (timeout < 0) {
      throw new Error("timeOut must not be a negative number");
    }

    let elapsed = 0;
    const intervalMs = pollingInterval * 1000;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const receipt = await this.getTransactionReceipt(txHash);
        if (receipt) {
          return receipt;
        }
      } catch (err) {
        if (!ignoreError) {
          throw err;
        }
      }

      if (timeout > 0 && elapsed >= timeout) {
        break;
      }

      await sleep(intervalMs);
      elapsed += pollingInterval;
    }

    throw new TimeoutError(
      "Timed out before a transaction receipt was available"
    );
  }
}
