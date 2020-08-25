import * as address from "./address";

test("isValidAddress", () => {
  expect(
    address.isValidAddress("0x0000000000000000000000000000000000000000")
  ).toBe(true);
  expect(
    address.isValidAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  ).toBe(true);
  expect(
    address.isValidAddress("0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
  ).toBe(true);
  expect(
    address.isValidAddress("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa")
  ).toBe(true);

  expect(
    address.isValidAddress("0xAAAAAAAAAAAAAAAAAAaaaaaaaaaaaaaaaaaaaaaa")
  ).toBe(false);

  expect(address.isValidAddress("")).toBe(false);
  expect(address.isValidAddress("0x")).toBe(false);
  expect(
    address.isValidAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb")
  ).toBe(false);

  expect(address.isValidAddress(undefined as any)).toBe(false);
  expect(address.isValidAddress(null as any)).toBe(false);
  expect(address.isValidAddress(123 as any)).toBe(false);
});

test("ensureValidAddress", () => {
  expect(
    address.ensureValidAddress("0x0000000000000000000000000000000000000000")
  ).toEqual("0x0000000000000000000000000000000000000000");
  expect(
    address.ensureValidAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  ).toEqual("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");
  expect(
    address.ensureValidAddress("0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
  ).toBe("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");
  expect(
    address.ensureValidAddress("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa")
  ).toBe("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");

  expect(() =>
    address.ensureValidAddress("0xAAAAAAAAAAAAAAAAAAaaaaaaaaaaaaaaaaaaaaaa")
  ).toThrow(address.InvalidAddressError);

  expect(() => address.ensureValidAddress("")).toThrow(
    address.InvalidAddressError
  );
  expect(() => address.ensureValidAddress("0x")).toThrow(
    address.InvalidAddressError
  );
  expect(() =>
    address.ensureValidAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb")
  ).toThrow(address.InvalidAddressError);

  expect(() => address.ensureValidAddress(undefined as any)).toThrow(
    address.InvalidAddressError
  );
  expect(() => address.ensureValidAddress(null as any)).toThrow(
    address.InvalidAddressError
  );
  expect(() => address.ensureValidAddress(123 as any)).toThrow(
    address.InvalidAddressError
  );
});

test("checksumAddress", () => {
  expect(
    address.checksumAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  ).toEqual("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");
  expect(
    address.checksumAddress("0xAAAAAAAAAAAAAAAAAAaaaaaaaaaaaaaaaaaaaaaa")
  ).toEqual("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");
  expect(
    address.checksumAddress("0x33907bb48ad33ac84c2dc904715ff36facfe81a3")
  ).toEqual("0x33907bB48AD33aC84C2dC904715FF36faCfe81a3");

  expect(() => address.checksumAddress("")).toThrow(
    address.InvalidAddressError
  );
  expect(() => address.checksumAddress("0x")).toThrow(
    address.InvalidAddressError
  );

  expect(() => address.checksumAddress(undefined as any)).toThrow(
    address.InvalidAddressError
  );
  expect(() => address.checksumAddress(null as any)).toThrow(
    address.InvalidAddressError
  );
  expect(() => address.checksumAddress(123 as any)).toThrow(
    address.InvalidAddressError
  );
});
