import BN from "bn.js";
import { bufferFromHexString } from "../util";

/** Unsigned Ethereum transaction */
export class UnsignedTransaction {
  public to: string;
  public wei: BN;
  public data: Buffer;
  public nonce: number | null = null;
  public gasLimit: BN | null = null;
  public gasPrice: BN | null = null;

  /**
   * Constructor
   * @param params Transaction parameters
   */
  public constructor(params: {
    /** Destination address */
    to: string;
    /** Amount of wei to send */
    wei?: BN;
    /** Input data */
    data?: Buffer | string;
    /** Nonce */
    nonce?: number | null;
    /** Gas limit */
    gasLimit?: BN | null;
    /** Gas price */
    gasPrice?: BN | null;
  }) {
    this.to = params.to;
    this.wei = params.wei || new BN(0);

    if (typeof params.data === "string") {
      this.data = bufferFromHexString(params.data);
    } else {
      this.data = params.data || Buffer.alloc(0);
    }

    this.nonce = params.nonce ?? null;
    this.gasLimit = params.gasLimit || null;
    this.gasPrice = params.gasPrice || null;
  }
}
