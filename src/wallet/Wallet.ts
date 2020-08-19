import { HDKey, Mnemonic } from "wallet.ts";
import { randomBytes } from "crypto";
import { hexStringFromBuffer, bufferFromHexString } from "../util/types";
import { Account } from "./Account";

const VALID_MNEMONIC_WORD_COUNT = [12, 15, 18, 21, 24];

/**
 * Generate a new random mnemonic phrase
 * @param wordCount (Valid values: 12, 15, 18, 21, 24) Word count
 * @returns An object containing a mnemonic phrase and a hexadecimal master seed
 * ({ phrase, seed })
 */
export function generateMnemonic(
  wordCount: 12 | 15 | 18 | 21 | 24 = 12
): { phrase: string; seed: string } {
  if (!VALID_MNEMONIC_WORD_COUNT.includes(wordCount)) {
    throw new Error("Invalid word count");
  }
  const entropy = randomBytes((wordCount * 4) / 3);
  const mnemonic = Mnemonic.generate(entropy);
  return {
    phrase: mnemonic.phrase,
    seed: hexStringFromBuffer(mnemonic.toSeed()),
  };
}

/**
 * A wallet derived from a master seed or a mnemonic phrase. Any number of
 * accounts can be obtained from a single Wallet.
 */
export class Wallet {
  private readonly _hdKey: HDKey;
  private readonly _accounts = new Map<number, Account>();

  /**
   * Constructor
   * @param seed Master seed
   */
  public constructor(seed: string | Buffer) {
    const seedBuf = typeof seed === "string" ? bufferFromHexString(seed) : seed;
    this._hdKey = HDKey.parseMasterSeed(seedBuf);
  }

  /**
   * Create a Wallet object with a mnemonic phrase
   * @param phrase Mnemonic phrase
   * @returns Wallet object
   */
  public static fromMnemonic(phrase: string): Wallet {
    const mnemonic = Mnemonic.parse(phrase);
    if (mnemonic === null) {
      throw new Error("Invalid mnemonic phrase");
    }
    return new Wallet(mnemonic.toSeed());
  }

  /**
   * Derive an account
   * @param index (Default: 0) Account index
   * @returns Account object
   */
  public getAccount(index = 0): Account {
    let account = this._accounts.get(index);
    if (!account) {
      const child = this._hdKey.derive(`m/44'/60'/0'/0/${index}`);
      if (child.privateKey === null) {
        throw new Error("private key could not be derived");
      }
      account = new Account(child.privateKey, child.publicKey);
      this._accounts.set(index, account);
    }
    return account;
  }
}
