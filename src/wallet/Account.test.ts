import { Account } from "./Account";
import { HDKey } from "wallet.ts";
import { randomBytes } from "crypto";

describe("Account", () => {
  let hdKey: HDKey;
  let account: Account;

  beforeEach(() => {
    hdKey = HDKey.parseMasterSeed(randomBytes(64));
    if (!hdKey.privateKey) {
      fail("private key cannot be null");
    }
    account = new Account(hdKey.privateKey, hdKey.publicKey);
  });

  test("privateKey", () => {
    expect(account.privateKey).toEqual(
      "0x" + hdKey.privateKey?.toString("hex")
    );
  });

  test("publicKey", () => {
    expect(account.publicKey).toEqual("0x" + hdKey.publicKey.toString("hex"));
  });
});
