import { EthereumAddress } from "wallet.ts";
import { bufferFromHexString, hexStringFromBuffer } from "../util";

/**
 * An Ethereum account
 */
export class Account {
  private readonly _privateKey: Buffer;
  private readonly _publicKey: Buffer;
  private _address?: string;

  /**
   * Constructor. Most users should derive an Account with the `getAccount`
   * method in Wallet class, instead of initializing an Account manually
   * @param privateKey Private Key
   * @param publicKey Public Key
   */
  public constructor(privateKey: string | Buffer, publicKey: string | Buffer) {
    this._privateKey =
      typeof privateKey === "string"
        ? bufferFromHexString(privateKey, "privateKey")
        : privateKey;
    this._publicKey =
      typeof publicKey === "string"
        ? bufferFromHexString(publicKey, "publicKey")
        : publicKey;
  }

  /**
   * Private key
   * @returns Hexadecimal string
   */
  public get privateKey(): string {
    return hexStringFromBuffer(this._privateKey);
  }

  /**
   * Public key
   * @returns Hexadecimal string
   */
  public get publicKey(): string {
    return hexStringFromBuffer(this._publicKey);
  }

  /**
   * Ethereum address
   * @returns A mixed-case address
   */
  public get address(): string {
    return this._address
      ? this._address
      : (this._address = EthereumAddress.from(this._publicKey).address);
  }
}
