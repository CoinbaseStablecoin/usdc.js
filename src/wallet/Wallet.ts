import { HDKey, Mnemonic } from "wallet.ts";
import { randomBytes } from "crypto";
import { Account } from "./Account";
import { ETH } from "./eth";
import { USDC } from "./usdc";
import { RPC } from "./rpc";
import { ERC20 } from "./erc20";
import { ensureValidAddress } from "../util";

const VALID_MNEMONIC_WORD_COUNT = [12, 15, 18, 21, 24];

/**
 * A wallet derived from a master seed or a mnemonic phrase. Any number of
 * accounts can be obtained from a single Wallet.
 */
export class Wallet {
  private readonly _hdKey: HDKey;
  private readonly _recoveryPhrase: string;
  private readonly _derivationPath: string;
  private readonly _accountIndex: number;
  private readonly _account: Account;
  private readonly _rpc: RPC;
  private readonly _eth: ETH;
  private readonly _usdc: USDC;
  private readonly _erc20s = new Map<string, ERC20>();

  /**
   * Instantiate a Wallet object with a given recovery prhase
   * @param recoveryPhrase Recovery phrase
   * @param accountIndex (Default: 0) Account index
   * @param derivationPath HD wallet derivation path
   * @param wordList Word list
   * @returns Wallet object
   */
  public static parse(
    recoveryPhrase: string,
    accountIndex = 0,
    derivationPath?: string,
    wordList?: string[]
  ): Wallet {
    return new Wallet({
      recoveryPhrase,
      accountIndex,
      derivationPath,
      wordList,
    });
  }

  /**
   * Generate a new random recovery phrase
   * @param wordCount (Valid values: 12, 15, 18, 21, 24) Word count
   * @param derivationPath HD wallet derivation path
   * @param wordList Word list
   * @returns Wallet object
   */
  public static generate(
    wordCount: 12 | 15 | 18 | 21 | 24 = 12,
    derivationPath?: string,
    wordList?: string[]
  ): Wallet {
    if (!VALID_MNEMONIC_WORD_COUNT.includes(wordCount)) {
      throw new Error("Invalid word count");
    }
    const entropy = randomBytes((wordCount * 4) / 3);
    const mnemonic = Mnemonic.generate(entropy, wordList);
    return new Wallet({
      seed: mnemonic,
      accountIndex: 0,
      derivationPath,
      wordList,
    });
  }

  private constructor(options: WalletOptions) {
    const { seed, recoveryPhrase, accountIndex, wordList, rpcURL } = options;
    const derivationPath = options.derivationPath ?? "m/44'/60'/0'/0";

    if (seed instanceof HDKey) {
      this._hdKey = seed;
      this._recoveryPhrase = recoveryPhrase || "";
    } else if (seed instanceof Mnemonic) {
      this._hdKey = HDKey.parseMasterSeed(seed.toSeed());
      this._recoveryPhrase = seed.phrase;
    } else if (typeof recoveryPhrase === "string") {
      const mnemonic = Mnemonic.parse(recoveryPhrase, wordList);
      if (!mnemonic) {
        throw new Error("Invalid recovery phrase");
      }
      this._hdKey = HDKey.parseMasterSeed(mnemonic.toSeed());
      this._recoveryPhrase = mnemonic.phrase;
    } else {
      throw new Error("Either seed or recoveryPhrase must be provided");
    }

    const child = this._hdKey.derive(`${derivationPath}/${accountIndex}`);
    if (child.privateKey === null) {
      throw new Error("private key could not be derived");
    }

    this._accountIndex = accountIndex;
    this._derivationPath = derivationPath;
    this._account = new Account(child.privateKey, child.publicKey);
    this._rpc = new RPC(rpcURL);
    this._eth = new ETH(this._account, this._rpc);
    this._usdc = new USDC(this._account, this._rpc);

    Object.defineProperties(this, {
      _hdKey: {
        value: this._hdKey,
        enumerable: false,
      },
      _recoveryPhrase: {
        value: this._recoveryPhrase,
        enumerable: false,
      },
    });
  }

  /**
   * Recovery phrase
   */
  public get recoveryPhrase(): string {
    return this._recoveryPhrase;
  }

  /**
   * Account index
   */
  public get accountIndex(): number {
    return this._accountIndex;
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
   * Address
   */
  public get address(): string {
    return this._account.address;
  }

  /**
   * ETH object
   */
  public get eth(): ETH {
    return this._eth;
  }

  /**
   * USDC object
   */
  public get usdc(): USDC {
    return this._usdc;
  }

  /**
   * ERC20 object
   * @param contractAddress ERC20 token contract address
   * @param decimalPlaces Number of decimal places (leave black to fetch)
   * @returns ERC20 object
   */
  public erc20(contractAddress: string, decimalPlaces?: number): ERC20 {
    const addr = ensureValidAddress(contractAddress);
    let e = this._erc20s.get(addr);
    if (!e) {
      e = new ERC20(this._account, this._rpc, addr, decimalPlaces);
      this._erc20s.set(addr, e);
    }
    return e;
  }

  /**
   * Instantiate a new Wallet object with a different account index
   * @param index Account index
   * @returns Wallet object
   */
  public selectAccount(index: number): Wallet {
    return new Wallet({
      seed: this._hdKey,
      recoveryPhrase: this._recoveryPhrase,
      accountIndex: index,
      derivationPath: this._derivationPath,
      rpcURL: this._rpc.url,
    });
  }

  /**
   * Specify the RPC URL
   * @param rpcURL RPC URL
   * @returns This
   */
  public connect(rpcURL: string): Wallet {
    this._rpc.setURL(rpcURL);
    return this;
  }

  /**
   * Get the number of confirmed transactions sent from an address
   * @param address (Default: this account) Address
   * @param blockHeight (Default: "latest") Block height
   * @returns A promise object that resolves to the number of transactions
   */
  public async getTransactionCount(
    address?: string,
    blockHeight: number | "latest" | "pending" = "latest"
  ): Promise<number> {
    return this._rpc.getTransactionCount(address || this.address, blockHeight);
  }
}

export interface WalletOptions {
  seed?: HDKey | Mnemonic;
  recoveryPhrase?: string;
  accountIndex: number;
  derivationPath?: string;
  wordList?: string[];
  rpcURL?: string;
}
