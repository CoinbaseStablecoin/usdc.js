import * as types from "./types";
import { bufferFromHexString } from "./types";

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
    expect(() => bufferFromHexString(t)).toThrow(TypeError);
  });
});
