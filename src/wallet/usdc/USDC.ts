import { RPC } from "../rpc";
import { Account } from "../Account";

export class USDC {
  private readonly _account: Account;
  private readonly _rpc: RPC;

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
}
