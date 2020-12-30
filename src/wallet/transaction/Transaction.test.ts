import { Transaction } from "./Transaction";
import { Account } from "../Account";
import { KEYS } from "../../test/fixtures";
import { RPC } from "../rpc";

describe("Transaction", () => {
  const { addr, priv, pub } = KEYS[0];
  const account = new Account(priv, pub);
  const rpc = new RPC("https://example.com");

  let tx: Transaction;

  beforeEach(() => {
    tx = new Transaction({ account, rpc });
  });

  describe("constructor", () => {
    test("create Transaction object", () => {
      expect(tx.from).toEqual(addr);
      expect(tx.to).toBe(null);
      expect(tx.ethValue).toBe(null);
      expect(tx.weiValue).toBe(null);
      expect(tx.gasLimit).toBe(null);
      expect(tx.gasPriceWei).toBe(null);
      expect(tx.gasPriceGwei).toBe(null);
      expect(tx.data).toEqual("0x");

      tx = new Transaction({
        account,
        rpc,
        to: "0x1111111111111111111111111111111111111111",
        ethValue: "1",
        gasLimit: 30000,
        gasPriceGwei: 1,
        data: "0xcafebabe",
      });
      expect(tx.from).toEqual(addr);
      expect(tx.to).toEqual("0x1111111111111111111111111111111111111111");
      expect(tx.ethValue).toEqual("1");
      expect(tx.weiValue).toEqual("1000000000000000000");
      expect(tx.gasLimit).toEqual(30000);
      expect(tx.gasPriceWei).toEqual(1000000000);
      expect(tx.gasPriceGwei).toEqual(1);
      expect(tx.data).toEqual("0xcafebabe");

      tx = new Transaction({
        account,
        rpc,
        to: "0x2222222222222222222222222222222222222222",
        weiValue: "123000000000000000",
        gasLimit: 25000,
        gasPriceWei: 1337000000,
        data: "0xabc",
      });
      expect(tx.from).toEqual(addr);
      expect(tx.to).toEqual("0x2222222222222222222222222222222222222222");
      expect(tx.ethValue).toEqual("0.123");
      expect(tx.weiValue).toEqual("123000000000000000");
      expect(tx.gasLimit).toEqual(25000);
      expect(tx.gasPriceWei).toEqual(1337000000);
      expect(tx.gasPriceGwei).toEqual(1.337);
      expect(tx.data).toEqual("0xabc");
    });

    test("throw if both weiValue and ethValue are given", () => {
      expect(
        () =>
          new Transaction({
            account,
            rpc,
            to: "0x1111111111111111111111111111111111111111",
            weiValue: "100000000000000000",
            ethValue: "0.1",
          })
      ).toThrow("Cannot specify both weiValue and ethValue");
    });

    test("throw if both gasPriceWei and gasPriceGwei are given", () => {
      expect(
        () =>
          new Transaction({
            account,
            rpc,
            to: "0x1111111111111111111111111111111111111111",
            gasPriceWei: 1000000000,
            gasPriceGwei: 1,
          })
      ).toThrow("Cannot specify both gasPriceWei and gasPriceGwei");
    });
  });

  test("setTo", () => {
    expect(tx.setTo("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(tx);
    expect(tx.to).toEqual("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");

    expect(tx.setTo(null)).toBe(tx);
    expect(tx.to).toBe(null);

    expect(() => {
      tx.setTo("0x11111");
    }).toThrow();
  });

  test("setWeiValue", () => {
    expect(tx.setWeiValue("1234500000000000000")).toBe(tx);
    expect(tx.weiValue).toEqual("1234500000000000000");
    expect(tx.ethValue).toEqual("1.2345");

    expect(tx.setWeiValue(null)).toBe(tx);
    expect(tx.weiValue).toBe(null);
    expect(tx.ethValue).toBe(null);

    expect(() => {
      tx.setWeiValue("-1");
    }).toThrow();
    expect(() => {
      tx.setWeiValue("1000000000000000000000000");
    }).toThrow();
  });

  test("setETHValue", () => {
    expect(tx.setETHValue("1337.7777")).toBe(tx);
    expect(tx.weiValue).toEqual("1337777700000000000000");
    expect(tx.ethValue).toEqual("1337.7777");

    expect(tx.setETHValue(null)).toBe(tx);
    expect(tx.weiValue).toBe(null);
    expect(tx.ethValue).toBe(null);

    expect(() => {
      tx.setETHValue("-0.0001");
    }).toThrow();
    expect(() => {
      tx.setETHValue("1000000");
    }).toThrow();
  });

  test("setGasLimit", () => {
    expect(tx.setGasLimit(21000)).toBe(tx);
    expect(tx.gasLimit).toEqual(21000);

    expect(tx.setGasLimit(1000000)).toBe(tx);
    expect(tx.gasLimit).toEqual(1000000);

    expect(tx.setGasLimit(null)).toBe(tx);
    expect(tx.gasLimit).toBe(null);

    expect(() => {
      tx.setGasLimit(20999);
    }).toThrow();

    expect(() => {
      tx.setGasLimit(20000001);
    }).toThrow();
  });

  test("setGasPriceWei", () => {
    expect(tx.setGasPriceWei(1230000000)).toBe(tx);
    expect(tx.gasPriceWei).toEqual(1230000000);
    expect(tx.gasPriceGwei).toEqual(1.23);

    expect(tx.setGasPriceWei(null)).toBe(tx);
    expect(tx.gasPriceWei).toBe(null);
    expect(tx.gasPriceGwei).toBe(null);

    expect(() => {
      tx.setGasPriceWei(-1);
    }).toThrow();

    expect(() => {
      tx.setGasPriceWei(1000000000001);
    }).toThrow();
  });

  test("setGasPriceGwei", () => {
    expect(tx.setGasPriceGwei(12.34)).toBe(tx);
    expect(tx.gasPriceWei).toEqual(12340000000);
    expect(tx.gasPriceGwei).toEqual(12.34);

    expect(tx.setGasPriceGwei(null)).toBe(tx);
    expect(tx.gasPriceWei).toBe(null);
    expect(tx.gasPriceGwei).toBe(null);

    expect(() => {
      tx.setGasPriceGwei(-0.01);
    }).toThrow();

    expect(() => {
      tx.setGasPriceGwei(1000.001);
    }).toThrow();
  });

  test("setData", () => {
    expect(tx.setData("0xabc")).toBe(tx);
    expect(tx.data).toEqual("0xabc");

    expect(tx.setData("1234")).toBe(tx);
    expect(tx.data).toEqual("0x1234");

    expect(tx.setData("")).toBe(tx);
    expect(tx.data).toEqual("0x");

    expect(tx.setData(null)).toBe(tx);
    expect(tx.data).toEqual("0x");

    expect(() => {
      tx.setData("0xhello");
    }).toThrow();
  });
});
