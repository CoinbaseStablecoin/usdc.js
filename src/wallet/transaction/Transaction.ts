import { RPC } from "../rpc";
import { Account } from "../Account";
import {
  ensureValidAddress,
  bnFromDecimalString,
  ensureHexString,
  ONE_ETHER,
  decimalStringFromBN,
  hexStringFromBN,
  numberFromHexString,
  bufferFromHexString,
  bufferFromNumber,
  bufferFromBN,
  keccak256,
  hexStringFromBuffer,
} from "../../util";
import BN from "bn.js";
import * as rlp from "rlp";
import { TransactionSubmission } from "./TransactionSubmission";
import { JSONRPCError, TransactionReceipt } from "../rpc/types";

export class Transaction {
  private readonly _account: Account;
  private readonly _rpc: RPC;
  private _to?: string;
  private _value?: BN;
  private _gasLimit?: number;
  private _gasPrice?: BN;
  private _data?: string;
  private _nonce?: number;
  private _toPromise?: Promise<string>;
  private _dataPromise?: Promise<string>;

  /**
   * Constructor
   * @param options A TransactionOptions object
   */
  public constructor(options: TransactionOptions) {
    this._account = options.account;
    this._rpc = options.rpc;

    if (options.to) {
      this.setTo(options.to);
    }
    if (options.weiValue && options.ethValue) {
      throw new Error("Cannot specify both weiValue and ethValue");
    }
    if (typeof options.weiValue === "string") {
      this.setWeiValue(options.weiValue);
    }
    if (typeof options.ethValue === "string") {
      this.setETHValue(options.ethValue);
    }
    if (typeof options.gasLimit === "number") {
      this.setGasLimit(options.gasLimit);
    }
    if (
      typeof options.gasPriceWei === "number" &&
      typeof options.gasPriceGwei === "number"
    ) {
      throw new Error("Cannot specify both gasPriceWei and gasPriceGwei");
    }
    if (typeof options.gasPriceWei === "number") {
      this.setGasPriceWei(options.gasPriceWei);
    }
    if (typeof options.gasPriceGwei === "number") {
      this.setGasPriceGwei(options.gasPriceGwei);
    }
    if (typeof options.data === "string") {
      this.setData(options.data);
    }
    if (options.toPromise instanceof Promise) {
      this._toPromise = options.toPromise;
    }
    if (options.dataPromise instanceof Promise) {
      this._dataPromise = options.dataPromise;
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
   * Set the data. Throws an error if the given data is not a valid hexadecimal
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

  /**
   * Sets the nonce. Throws an error if an invalid value is given.
   * @param nonce Nonce
   * @returns This
   */
  public setNonce(nonce: number | null): Transaction {
    if (nonce == null) {
      this._nonce = undefined;
      return this;
    }
    if (!Number.isInteger(nonce)) {
      throw new Error("Nonce must be an integer");
    }
    this._nonce = nonce;
    return this;
  }

  /**
   * Estimate the gas usage of this transaction. It's a good idea to add a
   * buffer to the number returned by this function.
   * @returns Estimated gas usage
   */
  public async estimateGas(): Promise<number> {
    const result = await this._rpc.callMethod("eth_estimateGas", [
      {
        from: this._account.address,
        to: this._to,
        value: this._value ? hexStringFromBN(this._value) : "0x0",
        data: this.data,
      },
    ]);
    return numberFromHexString(result);
  }

  /**
   * Sign this transaction. If the nonce is not specified, uses the current
   * confirmed transaction count. If the gas limit is not specified, it uses
   * the estimated gas usage with a 50% buffer. If the gas price is not
   * specified, uses the value returned by the node.
   * @returns Signed transaction in a hexadecimal string
   */
  public async sign(): Promise<string> {
    const chainId = await this._rpc.getChainId();

    let to = this._to;
    if (this._toPromise) {
      to = ensureValidAddress(await this._toPromise);
    }

    let data = this._data;
    if (this._dataPromise) {
      data = ensureHexString(await this._dataPromise);
    }

    const nonce =
      this._nonce ??
      (await this._rpc.getTransactionCount(this._account.address));

    const gasPrice = this._gasPrice || new BN(await this._rpc.getGasPrice());

    let gasLimit: number;
    if (this._gasLimit) {
      gasLimit = this._gasLimit;
    } else {
      const gas = await this.estimateGas();
      gasLimit = gas === 21000 ? gas : gas * 1.5;
    }

    const fields = [
      bufferFromNumber(nonce), // 0: nonce
      bufferFromBN(gasPrice), // 1: gas price
      bufferFromNumber(gasLimit), // 2: gas limit
      to ? bufferFromHexString(to) : Buffer.alloc(0), // 3: to
      this._value ? bufferFromBN(this._value) : Buffer.alloc(0), // 4: value
      data ? bufferFromHexString(data) : Buffer.alloc(0), // 5: data
      bufferFromNumber(chainId), // 6: chainID
      Buffer.alloc(0), // 7: 0
      Buffer.alloc(0), // 8: 0
    ];

    const hash = keccak256(rlp.encode(fields));
    const sig = await this._account.sign(hash);

    fields[6] = bufferFromNumber(sig.v + chainId * 2 + 8); // 6: v
    fields[7] = bufferFromHexString(sig.r); // 7: r
    fields[8] = bufferFromHexString(sig.s); // 8: s

    return hexStringFromBuffer(rlp.encode(fields));
  }

  /**
   * Sign and submit transaction
   * @returns A promise that resolves to a TransactionSubmission object
   */
  public async submit(): Promise<TransactionSubmission> {
    const signedTx = await this.sign();
    const txHash = hexStringFromBuffer(keccak256(signedTx));

    try {
      await this._rpc.callMethod("eth_sendRawTransaction", [signedTx]);
    } catch (err) {
      if (
        !(err instanceof JSONRPCError && err.message.match(/(known|imported)/i))
      ) {
        throw err;
      }
    }

    return new TransactionSubmission(this._rpc, txHash);
  }

  /**
   * Sign and submit transaction and poll for the transaction receipt
   * @param ignoreError (Default: true) Ignore any network errors
   * @param pollingInterval (Default: 5) Polling interval in seconds
   * @param timeout (Default: 0) Timeout in seconds. No timeout if zero.
   * @throws TimeoutError
   * @returns A promise that resolves to a TransactionReceipt object
   */
  public async submitAndWaitForReceipt(
    ignoreError = true,
    pollingInterval = 5,
    timeout = 0
  ): Promise<TransactionReceipt> {
    const submission = await this.submit();
    return submission.waitForReceipt(ignoreError, pollingInterval, timeout);
  }
}

export interface TransactionOptions {
  /** Account object */
  account: Account;
  /** RPC object */
  rpc: RPC;
  /** Recipient ("to") address */
  to?: string;
  /** A Promise object that resolves to the recipient ("to") address */
  toPromise?: Promise<string>;
  /** Value in wei as a string containing an integer */
  weiValue?: string;
  /** Value in ETH as a string containing a decimal number (e.g. "0.1") */
  ethValue?: string;
  /** Gas limit */
  gasLimit?: number;
  /** Gas price in wei */
  gasPriceWei?: number;
  /** Gas price in Gwei */
  gasPriceGwei?: number;
  /** Data as a hexadecimal string */
  data?: string;
  /** A Promise object that resolves to the data as a hexadecimal string */
  dataPromise?: Promise<string>;
}
