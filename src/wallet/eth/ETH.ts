import { RPC } from "../rpc";
import { Account } from "../Account";
import {
  decodeABIValue,
  ensureValidAddress,
  decimalStringFromBN,
  stringFromBlockHeight,
} from "../../util";
import type BN from "bn.js";
import { Transaction } from "../transaction/Transaction";

export class ETH {
  private readonly _account: Account;
  private readonly _rpc: RPC;

  /**
   * Constructor. Most users should get an instance of this class by calling the
   * `eth` method in Wallet class, instead of constructing one manually.
   * @param account Account object
   * @param rpc RPC object
   */
  public constructor(account: Account, rpc: RPC) {
    this._account = account;
    this._rpc = rpc;
  }

  /**
   * Account object
   */
  public get account(): Account {
    return this._account;
  }

  /**
   * RPC object
   */
  public get rpc(): RPC {
    return this._rpc;
  }

  /**
   * Get account balance.
   * @param params Either an address or an object containing an address and
   * optionally, the block height. Leave empty for this wallet's address.
   * @returns A promise that resolves to a string containing a decimal number
   */
  public async getBalance(
    params:
      | string
      | {
          address?: string;
          blockHeight?: number | "latest" | "pending";
        } = {}
  ): Promise<string> {
    let address: string;
    let blockHeight: string;

    if (typeof params === "string") {
      address = params;
      blockHeight = "latest";
    } else {
      address = params.address || this._account.address;
      blockHeight = stringFromBlockHeight(params.blockHeight);
    }
    address = ensureValidAddress(address);

    const result = await this._rpc.callMethod("eth_getBalance", [
      address,
      blockHeight,
    ]);

    return decimalStringFromBN(decodeABIValue<BN>("uint256", result), 18);
  }

  /**
   * Create an empty transaction.
   * @returns A Transaction object
   */
  public createTransaction(): Transaction {
    return new Transaction({
      account: this._account,
      rpc: this._rpc,
    });
  }

  /**
   * Create a transaction to transfer Ether.
   * @param to Recipient's address
   * @param amount Amount in ether (e.g. "0.1")
   * @returns A Transaction object
   */
  public transfer(to: string, amount: string): Transaction {
    return new Transaction({
      account: this._account,
      rpc: this._rpc,
      to: ensureValidAddress(to),
      ethValue: amount,
    });
  }
}
