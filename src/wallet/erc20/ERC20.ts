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
import { ERC20_SELECTORS } from "./selectors";
import { GetBalanceOptions } from "../eth";

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
   * @param options Either an address or a GetBalanceOptions object. Leave blank
   * to use this wallet's address
   * @returns A promise that resolves to a string containing a decimal number
   */
  public async getBalance(
    options: string | GetBalanceOptions = {}
  ): Promise<string> {
    const contractAddress = await this.getContractAddress();
    const decimals = await this.getDecimalPlaces();

    let address: string;
    let blockHeight: number | "latest" | "pending";

    if (typeof options === "string") {
      address = ensureValidAddress(options);
      blockHeight = "latest";
    } else {
      address = options.address
        ? ensureValidAddress(options.address, "address")
        : this._account.address;
      blockHeight = options.blockHeight ?? "latest";
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
   * @param options Either the spender's address or a GetAllowanceOptions object
   * @returns A promise that resolves to a string containing a decimal number
   */
  public async getAllowance(
    options: string | GetAllowanceOptions
  ): Promise<string> {
    const contractAddress = await this.getContractAddress();
    const decimals = await this.getDecimalPlaces();

    let owner: string;
    let spender: string;
    let blockHeight: number | "latest" | "pending";

    if (typeof options === "string") {
      owner = this._account.address;
      spender = ensureValidAddress(options);
      blockHeight = "latest";
    } else {
      owner = options.owner
        ? ensureValidAddress(options.owner, "owner")
        : this._account.address;
      spender = ensureValidAddress(options.spender, "spender");
      blockHeight = options.blockHeight ?? "latest";
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
   * @param amount Amount as a decimal number in a string (e.g. "0.1")
   * @returns A Transaction object
   */
  public transfer(to: string, amount: string): Transaction {
    const toAddr = ensureValidAddress(to);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      return (
        ERC20_SELECTORS.transfer +
        encodeABIParameters(
          ["address", "uint256"],
          [toAddr, bnFromDecimalString(amount, decimals, "amount")],
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
   * @param allowance Allowance amount as a decimal number in a string ("0.1")
   * @returns A Transaction object
   */
  public grantAllowance(spender: string, allowance: string): Transaction {
    const spenderAddr = ensureValidAddress(spender);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      return (
        ERC20_SELECTORS.approve +
        encodeABIParameters(
          ["address", "uint256"],
          [spenderAddr, bnFromDecimalString(allowance, decimals, "allowance")],
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
   * @param amount Amount as a decimal number in a string (e.g. "0.1")
   * @returns A Transaction object
   */
  public spendAllowance(
    owner: string,
    to: string,
    amount: string
  ): Transaction {
    const ownerAddr = ensureValidAddress(owner, "owner");
    const toAddr = ensureValidAddress(to, "to");

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      return (
        ERC20_SELECTORS.transferFrom +
        encodeABIParameters(
          ["address", "address", "uint256"],
          [ownerAddr, toAddr, bnFromDecimalString(amount, decimals, "amount")],
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

export interface GetAllowanceOptions {
  /** Spender's address */
  spender: string;
  /** Owner's address (Default: This wallet's address) */
  owner?: string;
  /** Block height (Default: "latest") */
  blockHeight?: number | "latest" | "pending";
}
