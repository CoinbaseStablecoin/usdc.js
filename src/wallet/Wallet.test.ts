/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Wallet } from "./Wallet";
import { Mnemonic, EthereumAddress } from "wallet.ts";
import { ETH } from "./ETH";
import { USDC } from "./USDC";
import { RPC } from "./RPC";

describe("Wallet", () => {
  test("+generate", () => {
    const wallet1 = Wallet.generate();
    const wallet2 = Wallet.generate();
    const wallet3 = Wallet.generate(24);

    expect(wallet1).toBeInstanceOf(Wallet);
    expect(wallet2).toBeInstanceOf(Wallet);
    expect(wallet3).toBeInstanceOf(Wallet);

    expect(wallet1.recoveryPhrase).not.toBeNull();
    expect(wallet2.recoveryPhrase).not.toBeNull();
    expect(wallet3.recoveryPhrase).not.toBeNull();

    expect(wallet1.recoveryPhrase?.split(" ").length).toEqual(12);
    expect(wallet2.recoveryPhrase?.split(" ").length).toEqual(12);
    expect(wallet3.recoveryPhrase?.split(" ").length).toEqual(24);

    expect(() => Mnemonic.parse(wallet1.recoveryPhrase!)).not.toThrow();
    expect(() => Mnemonic.parse(wallet2.recoveryPhrase!)).not.toThrow();
    expect(() => Mnemonic.parse(wallet3.recoveryPhrase!)).not.toThrow();

    expect(wallet1.recoveryPhrase).not.toEqual(wallet2.recoveryPhrase);
    expect(wallet1.address).not.toEqual(wallet2.address);
    expect(wallet1.address).not.toEqual(wallet3.address);
    expect(wallet2.address).not.toEqual(wallet3.address);
  });

  test("+parse", () => {
    const wallet = Wallet.generate();
    const { recoveryPhrase } = wallet;
    expect(recoveryPhrase).not.toBeNull();

    const wallet2 = Wallet.parse(recoveryPhrase!);
    expect(wallet2.address).toEqual(wallet.address);
    expect(wallet2.recoveryPhrase).toEqual(recoveryPhrase);
  });

  test("-address", () => {
    const wallet = Wallet.generate();
    expect(EthereumAddress.isValid(wallet.address)).toBe(true);
    expect(wallet.address).toEqual(wallet.account.address);
  });

  test("-recoveryPhrase", () => {
    const wallet = Wallet.generate();
    expect(wallet.recoveryPhrase).not.toBeNull();
    expect(() => Mnemonic.parse(wallet.recoveryPhrase!)).not.toThrow();
  });

  test("-rpc", () => {
    const wallet = Wallet.generate();
    expect(wallet.rpc).toBeInstanceOf(RPC);
  });

  test("-eth", () => {
    const wallet = Wallet.generate();
    expect(wallet.eth).toBeInstanceOf(ETH);

    expect(wallet.eth.account).toBe(wallet.account);
    expect(wallet.eth.rpc).toBe(wallet.rpc);
  });

  test("-usdc", () => {
    const wallet = Wallet.generate();
    expect(wallet.usdc).toBeInstanceOf(USDC);

    expect(wallet.usdc.account).toBe(wallet.account);
    expect(wallet.usdc.rpc).toBe(wallet.rpc);
  });

  test("-connect", () => {
    const wallet = Wallet.generate();
    const rpc = wallet.rpc;
    expect(rpc.url).toEqual("");

    expect(wallet.connect("http://localhost:8545")).toBe(wallet);
    expect(wallet.rpc).toBe(rpc); // does not re-instantiate RPC
    expect(rpc.url).toEqual("http://localhost:8545");
  });

  test("-selectAccount, -accountIndex", () => {
    const wallet = Wallet.generate().connect("http://localhost:8545");
    const account0 = wallet.selectAccount(0);
    const account1 = wallet.selectAccount(1);
    const account2 = wallet.selectAccount(2);

    expect(wallet.accountIndex).toEqual(0);
    expect(account0.accountIndex).toEqual(0);
    expect(account1.accountIndex).toEqual(1);
    expect(account2.accountIndex).toEqual(2);

    expect(account0.account).toEqual(wallet.account);
    expect(account0.account).not.toEqual(account1.account);
    expect(account0.account).not.toEqual(account2.account);
    expect(account1.account).not.toEqual(account2.account);

    expect(wallet.recoveryPhrase).not.toBeNull();
    expect(account0.recoveryPhrase).toEqual(wallet.recoveryPhrase);
    expect(account1.recoveryPhrase).toEqual(wallet.recoveryPhrase);
    expect(account2.recoveryPhrase).toEqual(wallet.recoveryPhrase);

    // Creates new instances of rpc with the same URL
    expect(account0.rpc).not.toBe(wallet.rpc);
    expect(account0.rpc).not.toBe(account1.rpc);
    expect(account0.rpc).not.toBe(account2.rpc);
    expect(account1.rpc).not.toBe(account2.rpc);
    expect(account0.rpc.url).toEqual(wallet.rpc.url);
    expect(account0.rpc.url).toEqual(account1.rpc.url);
    expect(account0.rpc.url).toEqual(account2.rpc.url);
    expect(account1.rpc.url).toEqual(account2.rpc.url);

    expect(() => Mnemonic.parse(wallet.recoveryPhrase!)).not.toThrow();
  });
});
