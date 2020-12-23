import { RPC } from "../rpc";
import { Account } from "../Account";
import {
  decodeABIValue,
  ensureValidAddress,
  decimalStringFromBN,
} from "../../util";
import type BN from "bn.js";

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
   * @param params An object containing an address and optionally, the block
   * height. Leave empty for this wallet's address.
   * @returns A promise that resolves to a string containing a decimal number
   */
  public async getBalance(
    params: {
      address?: string;
      blockHeight?: number | "latest" | "pending";
    } = {}
  ): Promise<string> {
    const address = params.address
      ? ensureValidAddress(params.address)
      : this._account.address;
    const blockHeight = params.blockHeight ?? "latest";

    const result = await this._rpc.callMethod("eth_getBalance", [
      address,
      blockHeight,
    ]);

    return decimalStringFromBN(decodeABIValue<BN>("uint256", result), 18);
  }
}
