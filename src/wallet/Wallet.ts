import { HDKey, Mnemonic } from "wallet.ts";
import { randomBytes } from "crypto";
import { Account } from "./Account";
import { RPC } from "./RPC";
import { ETH } from "./ETH";
import { USDC } from "./USDC";

const VALID_MNEMONIC_WORD_COUNT = [12, 15, 18, 21, 24];

/**
 * A wallet derived from a master seed or a mnemonic phrase. Any number of
 * accounts can be obtained from a single Wallet.
 */
export class Wallet {
  private readonly _hdKey: HDKey;
  private readonly _recoveryPhrase: string | null = null;
  private readonly _derivationPath: string;
  private readonly _accountIndex: number;
  private readonly _account: Account;
  private readonly _rpc: RPC;
  private readonly _eth: ETH;
  private readonly _usdc: USDC;

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
   * @param wordList
   * @returns
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

  private constructor(params: {
    seed?: HDKey | Mnemonic;
    recoveryPhrase?: string | null;
    accountIndex: number;
    derivationPath?: string;
    wordList?: string[];
    rpcURL?: string;
  }) {
    const { seed, recoveryPhrase, accountIndex, wordList, rpcURL } = params;
    const derivationPath = params.derivationPath ?? "m/44'/60'/0'/0";

    if (seed instanceof HDKey) {
      this._hdKey = seed;
      if (typeof recoveryPhrase === "string") {
        this._recoveryPhrase = recoveryPhrase;
      }
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
  }

  public get recoveryPhrase(): string | null {
    return this._recoveryPhrase;
  }

  public get accountIndex(): number {
    return this._accountIndex;
  }

  public get account(): Account {
    return this._account;
  }

  public get rpc(): RPC {
    return this._rpc;
  }

  public get address(): string {
    return this._account.address;
  }

  public get eth(): ETH {
    return this._eth;
  }

  public get usdc(): USDC {
    return this._usdc;
  }

  public selectAccount(index: number): Wallet {
    return new Wallet({
      seed: this._hdKey,
      recoveryPhrase: this._recoveryPhrase,
      accountIndex: index,
      derivationPath: this._derivationPath,
      rpcURL: this._rpc.url,
    });
  }

  public connect(rpcURL: string): Wallet {
    this._rpc.url = rpcURL;
    return this;
  }
}
