import { RPC } from "../rpc";
import { TransactionReceipt } from "../rpc/types";

export class TransactionSubmission {
  private _txHash: string;
  private readonly _rpc: RPC;

  /**
   * Constructor
   * @param rpc RPC object
   * @param txHash Transaction hash
   */
  public constructor(rpc: RPC, txHash: string) {
    this._rpc = rpc;
    this._txHash = txHash;
  }

  /**
   * Transaction hash
   */
  public get txHash(): string {
    return this.txHash;
  }

  /**
   * Get the transaction receipt
   * @returns A promise that resolves to a TransactionReceipt object or null if
   * it is not available
   */
  public async getReceipt(): Promise<TransactionReceipt | null> {
    return this._rpc.getTransactionReceipt(this._txHash);
  }

  /**
   * Poll for the transaction receipt
   * @param ignoreError (Default: true) Ignore any network errors
   * @param pollingInterval (Default: 5) Polling interval in seconds
   * @param timeout (Default: 0) Timeout in seconds. No timeout if zero.
   * @throws TimeoutError
   * @returns A promise that resolves to a TransactionReceipt object
   */
  public async waitForReceipt(
    ignoreError = true,
    pollingInterval = 5,
    timeout = 0
  ): Promise<TransactionReceipt> {
    return this._rpc.waitForReceipt(
      this._txHash,
      ignoreError,
      pollingInterval,
      timeout
    );
  }
}
