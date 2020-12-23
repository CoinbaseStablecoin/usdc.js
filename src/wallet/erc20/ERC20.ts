import { RPC } from "../rpc";
import { Account } from "../Account";
import BN from "bn.js";
import { ensureValidAddress, decimalStringFromBN } from "../../util";

export class ERC20 {
  protected readonly _account: Account;
  protected readonly _rpc: RPC;
  protected __contractAddress: string;
  protected __decimalPlaces?: number;

  /**
   * Constructor. Most users should get an instance of this class by calling the
   * `erc20` method in Wallet class, instead of constructing one manually.
   * @param account Account object
   * @param rpc RPC object
   * @param contractAddress Token contract address
   * @param decimalPlaces Number of decimal places (leave blank to fetch)
   */
  public constructor(
    account: Account,
    rpc: RPC,
    contractAddress: string,
    decimalPlaces?: number
  ) {
    this._account = account;
    this._rpc = rpc;
    this.__contractAddress = contractAddress;
    this.__decimalPlaces = decimalPlaces;
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
    const contractAddress = await this.getContractAddress();
    const decimals = await this.getDecimalPlaces();

    let address: string;
    let blockHeight: number | "latest" | "pending";

    if (typeof params === "string") {
      address = params;
      blockHeight = "latest";
    } else {
      address = params.address || this._account.address;
      blockHeight = params.blockHeight ?? "latest";
    }
    address = ensureValidAddress(address);

    const result = await this._rpc.ethCall<BN>(
      contractAddress,
      "balanceOf(address)",
      ["address"],
      [address],
      "uint256",
      blockHeight,
      true
    );

    return decimalStringFromBN(result, decimals);
  }

  /**
   * Get the contract address.
   * @returns A promise that resolves to a contract address
   */
  public async getContractAddress(): Promise<string> {
    return this.__contractAddress;
  }

  /**
   * Get the number of decimal places.
   * @returns A promise that resolves to an integer
   */
  public async getDecimalPlaces(): Promise<number> {
    if (typeof this.__decimalPlaces !== "number") {
      const contractAddress = await this.getContractAddress();
      const decimals = await this._rpc.ethCall<BN>(
        contractAddress,
        "decimals()",
        [],
        [],
        "uint8",
        "latest",
        true
      );
      this.__decimalPlaces = decimals.toNumber();
    }
    return this.__decimalPlaces;
  }
}
