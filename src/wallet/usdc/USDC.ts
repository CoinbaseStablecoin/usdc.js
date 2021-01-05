import { RPC } from "../rpc";
import { Account } from "../Account";
import { ERC20 } from "../erc20";
import BN from "bn.js";
import {
  eip712Hash,
  ensureValidAddress,
  bnFromDecimalString,
  MAX_UINT256,
  encodeABIParameters,
  hexStringFromBuffer,
  bufferFromHexString,
} from "../../util";
import { Transaction } from "../transaction";
import { USDC_SELECTORS } from "./selectors";

export class USDC extends ERC20 {
  private __chainId?: number;
  private __domainSeparator?: string;
  private _contractAddressOverridden = false;

  /**
   * Constructor. Most users should get an instance of this class by calling the
   * `usdc` method in Wallet class, instead of constructing one manually.
   * @param account Account object
   * @param rpc RPC object
   */
  public constructor(account: Account, rpc: RPC) {
    super(account, rpc, "", 6);
  }

  /**
   * Override the contract address. Useful for custom deployments.
   * @param address USDC Contract Address
   */
  public overrideContractAddress(address: string): void {
    this.__contractAddress = address;
    this._contractAddressOverridden = true;
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
   * Get the contract address. Returns different contract addresses depending on
   * the chain ID.
   * @returns A promise that resolves to a contract address
   */
  public async getContractAddress(): Promise<string> {
    if (this._contractAddressOverridden) {
      return this.__contractAddress;
    }

    const chainId = await this._rpc.getChainId();

    if (!this.__contractAddress || chainId !== this.__chainId) {
      this.__chainId = chainId;

      switch (chainId) {
        case 1: // Mainnet
          this.__contractAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
          break;
        case 3: // Ropsten
          this.__contractAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
          break;
        case 4: // Rinkeby
          this.__contractAddress = "0x705de9dc3ad85e072ab34cf6850e6b2bd317ccc1";
          break;
        case 5: // Goerli
          this.__contractAddress = "0x2f3a40a3db8a7e3d09b0adfefbce4f6f81927557";
          break;
        case 137: // Matic
          this.__contractAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
          break;
        case 80001: // Mumbai
          this.__contractAddress = "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747";
          break;
        default:
          throw new Error(`Unknown chain ID: ${chainId}`);
      }
    }
    return this.__contractAddress;
  }

  /**
   * Get the next nonce for use with signPermit. The value returned by this
   * function does not take unconfirmed permit transactions into account.
   * @returns A promise that resolves to a number containing an integer
   */
  public async getNextPermitNonce(): Promise<number> {
    const contractAddress = await this.getContractAddress();

    const result = await this._rpc.ethCall<BN>(
      contractAddress,
      "nonces(address)",
      ["address"],
      [this._account.address],
      "uint256",
      "latest",
      true
    );

    return result.toNumber();
  }

  /**
   * Create a signed EIP-2612 permit that can be submitted to the blockchain by
   * anyone on behalf of this account to grant an allowance
   * @param options A SignPermitOptions object
   * @returns A promise that resolves to a SignedPermit object
   */
  public async signPermit(options: SignPermitOptions): Promise<SignedPermit> {
    const domainSeparator = await this.getDomainSeparator();
    const decimals = await this.getDecimalPlaces();

    const owner = this._account.address;
    const spender = ensureValidAddress(options.spender);
    const allowance = bnFromDecimalString(options.allowance, decimals);

    let nonce: number;
    if (typeof options.nonce !== "number") {
      nonce = await this.getNextPermitNonce();
    } else {
      nonce = options.nonce;
      if (!Number.isInteger(nonce) || nonce < 0) {
        throw new Error("Nonce must be a positive integer");
      }
    }

    const deadline: number | null =
      options.deadline instanceof Date
        ? Math.floor(options.deadline.getTime() / 1000)
        : null;

    const digest = eip712Hash(
      domainSeparator,
      "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)",
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner, spender, allowance, nonce, deadline ?? MAX_UINT256]
    );

    const signature = await this._account.sign(digest);

    return {
      ...signature,
      owner,
      spender,
      allowance: options.allowance,
      nonce,
      deadline,
    };
  }

  /**
   * Create a transaction to submit a signed EIP-2612 permit
   * @param signedPermit A SignedPermit object returned by signPermit function
   * @returns A Transaction object
   */
  public submitPermit(signedPermit: SignedPermit): Transaction {
    const owner = ensureValidAddress(signedPermit.owner);
    const spender = ensureValidAddress(signedPermit.spender);
    const deadline = signedPermit.deadline ?? MAX_UINT256;
    const { v } = signedPermit;
    const r = bufferFromHexString(signedPermit.r);
    const s = bufferFromHexString(signedPermit.s);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      const value = bnFromDecimalString(signedPermit.allowance, decimals);

      return (
        USDC_SELECTORS.permit +
        encodeABIParameters(
          [
            "address",
            "address",
            "uint256",
            "uint256",
            "uint8",
            "bytes32",
            "bytes32",
          ],
          [owner, spender, value, deadline, v, r, s],
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
   * Get the EIP-712 domain separator used by EIP-712 and EIP-3009
   * @returns A promise that resolves to a hexadecimal string containing the
   * domain separator
   */
  private async getDomainSeparator(): Promise<string> {
    if (!this.__domainSeparator) {
      const contractAddress = await this.getContractAddress();
      const domainSeparator = await this._rpc.ethCall<Buffer>(
        contractAddress,
        "DOMAIN_SEPARATOR()",
        [],
        [],
        "bytes32",
        "latest",
        false
      );

      if (!Buffer.isBuffer(domainSeparator) || domainSeparator.length !== 32) {
        throw new Error("Contract did not return a valid domain separator");
      }
      this.__domainSeparator = hexStringFromBuffer(domainSeparator);
    }
    return this.__domainSeparator;
  }
}

export interface SignPermitOptions {
  /** Spender's address */
  spender: string;
  /** Allowance amount in decimal number (e.g. "0.1") */
  allowance: string;
  /** Nonce for the permit (Default: fetch next permit nonce) */
  nonce?: number | null;
  /** Deadline in unix time (Default: no deadline) */
  deadline?: Date | null;
}

export interface SignedPermit {
  /** Owner's address */
  owner: string;
  /** Spender's address */
  spender: string;
  /** Allowance amount in decimal number (e.g. "0.1") */
  allowance: string;
  /** Nonce for the permit */
  nonce: number;
  /** Deadline in unix time (Omit for no deadline) */
  deadline?: number | null;
  /** v of the signature */
  v: number;
  /** r of the signature as a hexadecimal string */
  r: string;
  /** s of the signature as a hexadecimal string */
  s: string;
}
