import BN from "bn.js";
import * as types from "./types";

test("isHexString", () => {
  ([
    ["0xcafebabe", true],
    ["0xCaFe1234", true],
    ["0x1234", true],
    ["0xf00", true],
    ["0x1", true],
    ["0x", true],
    ["cafebabe", true],
    ["CaFe1234", true],
    ["1234", true],
    ["1", true],
    ["", true],
    ["0xcat", false],
    ["cat", false],
    ["0xf0od", false],
    ["f0od", false],
  ] as [string, boolean][]).forEach((t) => {
    expect(types.isHexString(t[0])).toBe(t[1]);
  });
});

test("ensureHexString", () => {
  [
    "0xcafebabe",
    "0xCaFe1234",
    "0x1234",
    "0xf00",
    "0x1",
    "0x",
    "cafebabe",
    "CaFe1234",
    "1234",
    "1",
    "",
  ].forEach((t) => {
    expect(types.ensureHexString(t)).toEqual(t);
  });

  ["0xcat", "cat", "0xf0od", "f0od"].forEach((t) => {
    expect(() => types.ensureHexString(t)).toThrow(TypeError);
  });
});

test("hexStringFromBuffer", () => {
  ["cafebabe", "cafe1234", "1234", "00", ""].forEach((t) => {
    const buf = Buffer.from(t, "hex");
    expect(types.hexStringFromBuffer(buf)).toEqual("0x" + t);
    expect(types.hexStringFromBuffer(buf, true)).toEqual("0x" + t);
    expect(types.hexStringFromBuffer(buf, false)).toEqual(t);
  });
});

test("bufferFromHexString", () => {
  [
    ["0xcafebabe", "cafebabe"],
    ["0xCaFe1234", "cafe1234"],
    ["0x1234", "1234"],
    ["0xb01", "0b01"],
    ["0x11", "11"],
    ["0x1", "01"],
    ["0x0", "00"],
    ["0x", ""],
    ["0", "00"],
    ["b01", "0b01"],
    ["CaFe1234", "cafe1234"],
  ].forEach((t) => {
    const buf = types.bufferFromHexString(t[0]);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.toString("hex")).toEqual(t[1]);
  });

  ["0xcat", "cat", "0xf0od", "f0od"].forEach((t) => {
    expect(() => types.bufferFromHexString(t)).toThrow(TypeError);
  });
});

test("strip0x", () => {
  expect(types.strip0x("0x")).toEqual("");
  expect(types.strip0x("0xcafebabe")).toEqual("cafebabe");
  expect(types.strip0x("cafebabe")).toEqual("cafebabe");
  expect(types.strip0x("")).toEqual("");
});

test("prepend0x", () => {
  expect(types.prepend0x("cafebabe")).toEqual("0xcafebabe");
  expect(types.prepend0x("")).toEqual("0x");
  expect(types.prepend0x("0xcafebabe")).toEqual("0xcafebabe");
  expect(types.prepend0x("0x")).toEqual("0x");
});

test("decimalStringFromBN", () => {
  expect(types.decimalStringFromBN(new BN(0))).toEqual("0");
  expect(types.decimalStringFromBN(new BN(0), 1)).toEqual("0");
  expect(types.decimalStringFromBN(new BN(1000000))).toEqual("1000000");
  expect(types.decimalStringFromBN(new BN(1000000), 1)).toEqual("100000");
  expect(types.decimalStringFromBN(new BN(1000001), 1)).toEqual("100000.1");
  expect(types.decimalStringFromBN(new BN(1000100), 1)).toEqual("100010");
  expect(types.decimalStringFromBN(new BN(1000000), 2)).toEqual("10000");
  expect(types.decimalStringFromBN(new BN(1000001), 2)).toEqual("10000.01");
  expect(types.decimalStringFromBN(new BN(1000100), 2)).toEqual("10001");
  expect(types.decimalStringFromBN(new BN(1000000), 5)).toEqual("10");
  expect(types.decimalStringFromBN(new BN(1000001), 5)).toEqual("10.00001");
  expect(types.decimalStringFromBN(new BN(1000100), 5)).toEqual("10.001");
  expect(types.decimalStringFromBN(new BN(1000000), 6)).toEqual("1");
  expect(types.decimalStringFromBN(new BN(1000001), 6)).toEqual("1.000001");
  expect(types.decimalStringFromBN(new BN(1000100), 6)).toEqual("1.0001");
  expect(types.decimalStringFromBN(new BN(1000000), 7)).toEqual("0.1");
  expect(types.decimalStringFromBN(new BN(1000001), 7)).toEqual("0.1000001");
  expect(types.decimalStringFromBN(new BN(1000100), 7)).toEqual("0.10001");
  expect(types.decimalStringFromBN(new BN(1000000), 8)).toEqual("0.01");
  expect(types.decimalStringFromBN(new BN(1000001), 8)).toEqual("0.01000001");
  expect(types.decimalStringFromBN(new BN(1000100), 8)).toEqual("0.010001");
  expect(types.decimalStringFromBN(new BN(1000000), 10)).toEqual("0.0001");
  expect(types.decimalStringFromBN(new BN(1000001), 10)).toEqual(
    "0.0001000001"
  );
  expect(types.decimalStringFromBN(new BN(1000100), 10)).toEqual("0.00010001");
  expect(types.decimalStringFromBN(new BN("3141592653589793238"), 18)).toEqual(
    "3.141592653589793238"
  );

  expect(() => types.decimalStringFromBN(new BN(-1))).toThrow();
});

test("bnFromDecimalString", () => {
  expect(types.bnFromDecimalString("0")).toEqual(new BN(0));
  expect(types.bnFromDecimalString("0", 1)).toEqual(new BN(0));
  expect(types.bnFromDecimalString("1000000")).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("100000", 1)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("100000.1", 1)).toEqual(new BN(1000001));
  expect(types.bnFromDecimalString("100010", 1)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("10000", 2)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("10000.01", 2)).toEqual(new BN(1000001));
  expect(types.bnFromDecimalString("10001", 2)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("10", 5)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("10.00001", 5)).toEqual(new BN(1000001));
  expect(types.bnFromDecimalString("10.001", 5)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("1", 6)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("1.000001", 6)).toEqual(new BN(1000001));
  expect(types.bnFromDecimalString("1.0001", 6)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("0.1", 7)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("0.1000001", 7)).toEqual(new BN(1000001));
  expect(types.bnFromDecimalString("0.10001", 7)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("0.01", 8)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("0.01000001", 8)).toEqual(new BN(1000001));
  expect(types.bnFromDecimalString("0.010001", 8)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("0.0001", 10)).toEqual(new BN(1000000));
  expect(types.bnFromDecimalString("0.0001000001", 10)).toEqual(
    new BN(1000001)
  );
  expect(types.bnFromDecimalString("0.00010001", 10)).toEqual(new BN(1000100));
  expect(types.bnFromDecimalString("3.141592653589793238", 18)).toEqual(
    new BN("3141592653589793238")
  );

  expect(types.bnFromDecimalString(".", 1)).toEqual(new BN(0));
  expect(types.bnFromDecimalString("1.", 0)).toEqual(new BN(1));
  expect(types.bnFromDecimalString("1.", 1)).toEqual(new BN(10));
  expect(types.bnFromDecimalString("1.", 2)).toEqual(new BN(100));
  expect(types.bnFromDecimalString(".1", 0)).toEqual(new BN(0));
  expect(types.bnFromDecimalString(".1", 1)).toEqual(new BN(1));
  expect(types.bnFromDecimalString(".1", 2)).toEqual(new BN(10));
  expect(types.bnFromDecimalString(".10", 0)).toEqual(new BN(0));
  expect(types.bnFromDecimalString(".10", 1)).toEqual(new BN(1));
  expect(types.bnFromDecimalString(".10", 2)).toEqual(new BN(10));

  expect(types.bnFromDecimalString("3.14159265", 2)).toEqual(new BN(314));

  expect(() => types.bnFromDecimalString("-1")).toThrow();
});
