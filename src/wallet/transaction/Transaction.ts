import { RPC } from "../rpc";
import { Account } from "../Account";
import {
  ensureValidAddress,
  bnFromDecimalString,
  ensureHexString,
  ONE_ETHER,
  decimalStringFromBN,
} from "../../util";
import BN from "bn.js";

export class Transaction {
  private readonly _account: Account;
  private readonly _rpc: RPC;
  private _to?: string;
  private _value?: BN;
  private _gasLimit?: number;
  private _gasPrice?: BN;
  private _data?: string;

  /**
   * Constructor
   * @param params Transaction parameters
   */
  public constructor(params: {
    account: Account;
    rpc: RPC;
    to?: string;
    weiValue?: string;
    ethValue?: string;
    gasLimit?: number;
    gasPriceWei?: number;
    gasPriceGwei?: number;
    data?: string;
  }) {
    this._account = params.account;
    this._rpc = params.rpc;

    if (params.to) {
      this.setTo(params.to);
    }
    if (params.weiValue && params.ethValue) {
      throw new Error("Cannot specify both weiValue and ethValue");
    }
    if (typeof params.weiValue === "string") {
      this.setWeiValue(params.weiValue);
    }
    if (typeof params.ethValue === "string") {
      this.setETHValue(params.ethValue);
    }
    if (typeof params.gasLimit === "number") {
      this.setGasLimit(params.gasLimit);
    }
    if (
      typeof params.gasPriceWei === "number" &&
      typeof params.gasPriceGwei === "number"
    ) {
      throw new Error("Cannot specify both gasPriceWei and gasPriceGwei");
    }
    if (typeof params.gasPriceWei === "number") {
      this.setGasPriceWei(params.gasPriceWei);
    }
    if (typeof params.gasPriceGwei === "number") {
      this.setGasPriceGwei(params.gasPriceGwei);
    }
    if (typeof params.data === "string") {
      this.setData(params.data);
    }
  }

  /**
   * Sender address
   */
  public get from(): string {
    return this._account.address;
  }

  /**
   * Destination address (or the contract address)
   */
  public get to(): string | null {
    return this._to || null;
  }

  /**
   * Value in wei
   */
  public get weiValue(): string | null {
    return this._value ? this._value.toString(10) : null;
  }

  /**
   * Value in ETH
   */
  public get ethValue(): string | null {
    return this._value ? decimalStringFromBN(this._value, 18) : null;
  }

  /**
   * Gas limit
   */
  public get gasLimit(): number | null {
    return this._gasLimit ?? null;
  }

  /**
   * Gas price in wei
   */
  public get gasPriceWei(): number | null {
    return this._gasPrice ? this._gasPrice.toNumber() : null;
  }

  /**
   * Gas price in Gwei
   */
  public get gasPriceGwei(): number | null {
    return this._gasPrice ? this._gasPrice.toNumber() / 1e9 : null;
  }

  /**
   * Data
   */
  public get data(): string {
    return this._data || "0x";
  }

  /**
   * Set the recipient address. Throws an error if an invalid address is given.
   * @param to Recipient address or null
   * @returns This
   */
  public setTo(to: string | null): Transaction {
    if (to == null) {
      this._to = undefined;
      return this;
    }
    this._to = ensureValidAddress(to);
    return this;
  }

  /**
   * Set the value in Ether. Throws an error if the given string does not
   * contain a valid integer.
   * @param weiValue Value in wei (e.g. "1000000000000000000") or null
   * @returns This
   */
  public setWeiValue(weiValue: string | null): Transaction {
    if (weiValue == null) {
      this._value = undefined;
      return this;
    }
    const value = new BN(weiValue);
    if (value.isNeg()) {
      throw new Error("ETH value must be positive");
    }
    if (value.gte(new BN(1e6).mul(ONE_ETHER))) {
      throw new Error("ETH value must be less than 1000000");
    }
    this._value = value;
    return this;
  }

  /**
   * Set the value in Ether. Throws an error if the given string does not
   * contain a valid decimal number.
   * @param ethValue Value in Ether (e.g. "0.1") or null
   * @returns This
   */
  public setETHValue(ethValue: string | null): Transaction {
    if (ethValue == null) {
      this._value = undefined;
      return this;
    }
    const value = bnFromDecimalString(ethValue, 18);
    if (value.gte(new BN(1e6).mul(ONE_ETHER))) {
      throw new Error("ETH value must be less than 1000000");
    }
    this._value = value;
    return this;
  }

  /**
   * Set the gas limit. Throws an error if an invalid value is given.
   * @param gasLimit Gas limit (e.g. 21000) or null
   * @returns This
   */
  public setGasLimit(gasLimit: number | null): Transaction {
    if (gasLimit == null) {
      this._gasLimit = undefined;
      return this;
    }
    if (!Number.isInteger(gasLimit)) {
      throw new Error("Gas limit must be an integer");
    }
    if (gasLimit < 21000) {
      throw new Error("Gas limit must be at least 21000");
    }
    // max block gas limit is 12.5M currently, but some third party chains have
    // higher limit
    if (gasLimit > 20000000) {
      throw new Error("Gas limit must not exceed 20000000");
    }
    this._gasLimit = gasLimit;
    return this;
  }

  /**
   * Set the Gas Price in wei. Throws an error if the given string is not a
   * valid integer.
   * @param gasPriceWei Gas price in wei (e.g 1000000000) or null
   * @returns This
   */
  public setGasPriceWei(gasPriceWei: number | null): Transaction {
    if (gasPriceWei == null) {
      this._gasPrice = undefined;
      return this;
    }
    if (!Number.isInteger(gasPriceWei)) {
      throw new Error("Gas price in wei must be an integer");
    }
    if (gasPriceWei < 0) {
      throw new Error("Gas price must be at least 0");
    }
    if (gasPriceWei > 1000e9) {
      throw new Error("Gas price must not exceed 1000 Gwei");
    }
    this._gasPrice = new BN(gasPriceWei);
    return this;
  }

  /**
   * Set the Gas Price in Gwei (wei * 10^9). Throws an error if an invalid value
   * is given.
   * @param gasPriceGwei Gas price in Gwei (e.g "10.1") or null
   * @returns This
   */
  public setGasPriceGwei(gasPriceGwei: number | null): Transaction {
    if (gasPriceGwei == null) {
      this._gasPrice = undefined;
      return this;
    }
    if (typeof gasPriceGwei !== "number") {
      throw new Error("Gas price must be a number");
    }
    if (gasPriceGwei < 0) {
      throw new Error("Gas price must be at least 0");
    }
    if (gasPriceGwei > 1000) {
      throw new Error("Gas price must not exceed 1000 Gwei");
    }
    this._gasPrice = new BN(Math.floor(gasPriceGwei * 1e9));
    return this;
  }

  /**
   * Set the data. Throws an error is the given data is not a valid hexadecimal
   * string.
   * @param data Data in hexadecimal string or null
   * @returns This
   */
  public setData(data: string | null): Transaction {
    if (data == null) {
      this._data = undefined;
      return this;
    }
    this._data = ensureHexString(data, undefined, true);
    return this;
  }
}
