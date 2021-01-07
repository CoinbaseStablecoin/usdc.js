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
   * @param options Either an address or a GetBalanceOptions object. Leave blank
   * to use this wallet's address
   * @returns A promise that resolves to a string containing a decimal number
   */
  public async getBalance(
    options: string | GetBalanceOptions = {}
  ): Promise<string> {
    let address: string;
    let blockHeight: string;

    if (typeof options === "string") {
      address = ensureValidAddress(options);
      blockHeight = "latest";
    } else {
      address = options.address
        ? ensureValidAddress(options.address, "address")
        : this._account.address;
      blockHeight = stringFromBlockHeight(options.blockHeight);
    }

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

export interface GetBalanceOptions {
  /** Address (Default: This wallet's address) */
  address?: string;
  /** Block height (Default: "latest") */
  blockHeight?: number | "latest" | "pending";
}
