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
  unixTimeFromDate,
  ensureHexString,
  ensurePositiveInteger,
} from "../../util";
import { Transaction } from "../transaction";
import { USDC_SELECTORS } from "./selectors";
import { randomBytes } from "crypto";

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
    const spender = ensureValidAddress(options.spender, "spender");
    const allowance = bnFromDecimalString(
      options.allowance,
      decimals,
      "allowance"
    );

    const nonce: number =
      typeof options.nonce === "number"
        ? ensurePositiveInteger(options.nonce, "Nonce")
        : await this.getNextPermitNonce();

    const deadline: number | BN = options.deadline
      ? unixTimeFromDate(options.deadline)
      : MAX_UINT256;

    const digest = eip712Hash(
      domainSeparator,
      "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)",
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner, spender, allowance, nonce, deadline],
      true
    );

    const signature = await this._account.sign(digest);

    return {
      ...signature,
      owner,
      spender,
      allowance: options.allowance,
      nonce,
      deadline: options.deadline,
    };
  }

  /**
   * Create a transaction to submit a signed EIP-2612 permit
   * @param signedPermit A SignedPermit object returned by signPermit function
   * @returns A Transaction object
   */
  public submitPermit(signedPermit: SignedPermit): Transaction {
    const owner = ensureValidAddress(signedPermit.owner, "owner");
    const spender = ensureValidAddress(signedPermit.spender, "spender");
    const deadline: number | BN = signedPermit.deadline
      ? unixTimeFromDate(signedPermit.deadline)
      : MAX_UINT256;
    const { v } = signedPermit;
    const r = bufferFromHexString(signedPermit.r);
    const s = bufferFromHexString(signedPermit.s);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      const value = bnFromDecimalString(
        signedPermit.allowance,
        decimals,
        "allowance"
      );

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
   * Create a signed EIP-3009 transfer authorization that can be submitted by
   * anyone on behalf of this account to transfer tokens
   * @param options A SignTransferAuthorizationOptions object
   * @returns A promise that resolves to a SignedTransferAuthorization object
   */
  public async signTransferAuthorization(
    options: SignTransferAuthorizationOptions
  ): Promise<SignedTransferAuthorization> {
    const domainSeparator = await this.getDomainSeparator();
    const decimals = await this.getDecimalPlaces();

    const from = this._account.address;
    const to = ensureValidAddress(options.to);
    const amount = bnFromDecimalString(options.amount, decimals, "amount");

    const validAfter = options.validAfter
      ? unixTimeFromDate(options.validAfter)
      : 0;
    const validBefore: number | BN = options.validBefore
      ? unixTimeFromDate(options.validBefore)
      : MAX_UINT256;

    const nonce: Buffer = options.nonce
      ? Buffer.from(ensureHexString(options.nonce), "hex")
      : randomBytes(32);

    const digest = eip712Hash(
      domainSeparator,
      "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)",
      ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
      [from, to, amount, validAfter, validBefore, nonce],
      true
    );

    const signature = await this._account.sign(digest);

    return {
      ...signature,
      from,
      to,
      amount: options.amount,
      validAfter: options.validAfter,
      validBefore: options.validBefore,
      nonce: hexStringFromBuffer(nonce),
    };
  }

  /**
   * Create a transaction to submit a signed EIP-3009 transfer authorization
   * @param signedAuthorization A SignedTransferAuthorization object returned by
   * signTransferAuthorization function
   * @returns A Transaction object
   */
  public submitTransferAuthorization(
    signedAuthorization: SignedTransferAuthorization
  ): Transaction {
    const from = ensureValidAddress(signedAuthorization.from, "from");
    const to = ensureValidAddress(signedAuthorization.to, "to");
    const validAfter = signedAuthorization.validAfter
      ? unixTimeFromDate(signedAuthorization.validAfter)
      : 0;
    const validBefore = signedAuthorization.validBefore
      ? unixTimeFromDate(signedAuthorization.validBefore)
      : MAX_UINT256;
    const nonce = bufferFromHexString(signedAuthorization.nonce);
    const { v } = signedAuthorization;
    const r = bufferFromHexString(signedAuthorization.r);
    const s = bufferFromHexString(signedAuthorization.s);

    const makeData = async (): Promise<string> => {
      const decimals = await this.getDecimalPlaces();
      const value = bnFromDecimalString(
        signedAuthorization.amount,
        decimals,
        "amount"
      );

      return (
        USDC_SELECTORS.transferWithAuthorization +
        encodeABIParameters(
          [
            "address",
            "address",
            "uint256",
            "uint256",
            "uint256",
            "bytes32",
            "uint8",
            "bytes32",
            "bytes32",
          ],
          [from, to, value, validAfter, validBefore, nonce, v, r, s],
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
  /** Allowance amount as a decimal number in a string (e.g. "0.1") */
  allowance: string;
  /** Nonce for the permit (Default: fetch next permit nonce) */
  nonce?: number | null;
  /** Deadline (Default: no deadline) */
  deadline?: Date | null;
}

export interface SignedPermit {
  /** Owner's address */
  owner: string;
  /** Spender's address */
  spender: string;
  /** Allowance amount as a decimal number in a string (e.g. "0.1") */
  allowance: string;
  /** Nonce for the permit */
  nonce: number;
  /** Deadline (Default: no deadline) */
  deadline?: Date | null;
  /** v of the signature */
  v: number;
  /** r of the signature as a hexadecimal string */
  r: string;
  /** s of the signature as a hexadecimal string */
  s: string;
}

export interface SignTransferAuthorizationOptions {
  /** Recipient's address */
  to: string;
  /** Amount to transfer as a decimal number in a string (e.g. "0.1") */
  amount: string;
  /** The time after which this is valid (Default: no limit) */
  validAfter?: Date | null;
  /** The time before which this is valid (Default: no limit) */
  validBefore?: Date | null;
  /** Unique 32-byte nonce as a hexadecimal string (Default: random nonce) */
  nonce?: string | null;
}

export interface SignedTransferAuthorization {
  /** Sender's address */
  from: string;
  /** Recipient's address */
  to: string;
  /** Amount to transfer as a decimal number in a string (e.g. "0.1") */
  amount: string;
  /** The time after which this is valid (Default: no limit) */
  validAfter?: Date | null;
  /** The time before which this is valid (Default: no limit) */
  validBefore?: Date | null;
  /** Unique 32-byte nonce as a hexadecimal string */
  nonce: string;
  /** v of the signature */
  v: number;
  /** r of the signature as a hexadecimal string */
  r: string;
  /** s of the signature as a hexadecimal string */
  s: string;
}
