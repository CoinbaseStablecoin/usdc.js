import { generateMnemonic, Wallet } from "./Wallet";
import { HDKey, Mnemonic } from "wallet.ts";
import { bufferFromHexString, isValidAddress } from "../util";
import { Account } from "./Account";

test("generateMnemonic", () => {
  const { phrase, seed } = generateMnemonic();
  expect(phrase.split(" ").length).toEqual(12);

  expect(() => Mnemonic.parse(phrase)).not.toThrow();
  expect(() => HDKey.parseMasterSeed(bufferFromHexString(seed))).not.toThrow();
});

describe("Wallet", () => {
  let wallet: Wallet;

  beforeEach(() => {
    const { seed } = generateMnemonic();
    wallet = new Wallet(seed);
  });

  test("fromMnemonic", () => {
    const { phrase } = generateMnemonic();
    const wallet = Wallet.fromMnemonic(phrase);
    expect(wallet).toBeInstanceOf(Wallet);
  });

  test("getAccount", () => {
    const account0 = wallet.getAccount(0);
    const account1 = wallet.getAccount(1);
    expect(account0).toBeInstanceOf(Account);
    expect(account1).toBeInstanceOf(Account);
    expect(isValidAddress(account0.address)).toBe(true);
    expect(isValidAddress(account1.address)).toBe(true);
    expect(account0.address).not.toEqual(account1.address);

    // Accounts derived are memoized
    expect(wallet.getAccount(0)).toBe(account0);
    expect(wallet.getAccount(1)).toBe(account1);

    // Default is 0
    expect(wallet.getAccount()).toBe(account0);
  });
});
