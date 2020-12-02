import { RPC } from "./RPC";
import { Account } from "./Account";

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
}
