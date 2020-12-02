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

  public constructor(account: Account, rpc: RPC) {
    this._account = account;
    this._rpc = rpc;
  }

  public get account(): Account {
    return this._account;
  }

  public get rpc(): RPC {
    return this._rpc;
  }

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
