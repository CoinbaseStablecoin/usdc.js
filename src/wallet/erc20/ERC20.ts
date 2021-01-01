import { RPC } from "../rpc";
import { Account } from "../Account";
import BN from "bn.js";
import {
  ensureValidAddress,
  decimalStringFromBN,
  encodeABIParameters,
  bnFromDecimalString,
} from "../../util";
import { Transaction } from "../transaction";
import { SELECTORS } from "./selectors";

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
      address = ensureValidAddress(params);
      blockHeight = "latest";
    } else {
      address = params.address
        ? ensureValidAddress(params.address)
        : this._account.address;
      blockHeight = params.blockHeight ?? "latest";
    }

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
   * Get the amount of tokens a given spender is allowed to spend on behalf of a
   * given owner. Leave owner unspecified to use this wallet's address.
   * @param params Either the spender's address or an object containing the
   * spender's address and optionally, the owner's address and the block height.
   * @returns A promise that resolves to a string containing a decimal number
   */
  public async getAllowance(
    params:
      | string
      | {
          spender: string;
          owner?: string;
          blockHeight?: number | "latest" | "pending";
        }
  ): Promise<string> {
    const contractAddress = await this.getContractAddress();
    const decimals = await this.getDecimalPlaces();

    let owner: string;
    let spender: string;
    let blockHeight: number | "latest" | "pending";

    if (typeof params === "string") {
      owner = this._account.address;
      spender = ensureValidAddress(params);
      blockHeight = "latest";
    } else {
      owner = params.owner
        ? ensureValidAddress(params.owner)
        : this._account.address;
      spender = ensureValidAddress(params.spender);
      blockHeight = params.blockHeight ?? "latest";
    }

    const result = await this._rpc.ethCall<BN>(
      contractAddress,
      "allowance(address,address)",
      ["address", "address"],
      [owner, spender],
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

  /**
   * Create a transaction to transfer tokens.
   * @param to Recipient's address
   * @param amount Amount in decimal number (e.g. "0.1")
   * @returns A Transaction object
   */
  public transfer(to: string, amount: string): Transaction {
    const toAddr = ensureValidAddress(to);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      return (
        SELECTORS.transfer +
        encodeABIParameters(
          ["address", "uint256"],
          [toAddr, bnFromDecimalString(amount, decimals)],
          false
        )
      );
    };

    return new Transaction({
      account: this._account,
      rpc: this._rpc,
      toPromise: this.getContractAddress(),
      dataPromise: makeData(),
    });
  }

  /**
   * Create a transaction to allow a given spender to spend a given amount of
   * tokens on one's behalf. (ERC20 approve function)
   * @param spender Spender's address
   * @param allowance Allowed amount
   * @returns A Transaction object
   */
  public grantAllowance(spender: string, allowance: string): Transaction {
    const spenderAddr = ensureValidAddress(spender);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      return (
        SELECTORS.approve +
        encodeABIParameters(
          ["address", "uint256"],
          [spenderAddr, bnFromDecimalString(allowance, decimals)],
          false
        )
      );
    };

    return new Transaction({
      account: this._account,
      rpc: this._rpc,
      toPromise: this.getContractAddress(),
      dataPromise: makeData(),
    });
  }

  /**
   * Create a transaction to spend an allowance that was granted previously.
   * (ERc20 transferFrom function)
   * @param owner Owner's address
   * @param to Recipient's address
   * @param amount Amount in decimal number (e.g. "0.1")
   * @returns A Transaction object
   */
  public spendAllowance(
    owner: string,
    to: string,
    amount: string
  ): Transaction {
    const ownerAddr = ensureValidAddress(owner);
    const toAddr = ensureValidAddress(to);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      return (
        SELECTORS.transferFrom +
        encodeABIParameters(
          ["address", "address", "uint256"],
          [ownerAddr, toAddr, bnFromDecimalString(amount, decimals)],
          false
        )
      );
    };
    return new Transaction({
      account: this._account,
      rpc: this._rpc,
      toPromise: this.getContractAddress(),
      dataPromise: makeData(),
    });
  }
}
