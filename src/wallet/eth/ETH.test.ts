import nock from "nock";
import { ETH } from "./ETH";
import { Account } from "../Account";
import { KEYS } from "../../test/fixtures";
import { RPC } from "../rpc";

const [key1, key2] = KEYS;

describe("ETH", () => {
  let eth: ETH;

  beforeEach(() => {
    nock.disableNetConnect();

    eth = new ETH(
      new Account(key1.priv, key1.pub),
      new RPC("https://example.com")
    );
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test("getBalance", async () => {
    nock("https://example.com")
      .persist()
      .matchHeader("content-type", "application/json")
      .matchHeader("accept", "application/json")

      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [key1.addr, "latest"],
      })
      .reply(200, { result: "0x1111d67bb1bb0000" })

      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [key2.addr, "latest"],
      })
      .reply(200, { result: "0x0" })

      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [key1.addr, "0xbc614e"],
      })
      .reply(200, { result: "0xde0b6b3a7640000" })

      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [key2.addr, "0xbc614e"],
      })
      .reply(200, { result: "0x16345785d8a0000" });

    expect(await eth.getBalance()).toEqual("1.23");
    expect(await eth.getBalance({ address: key1.addr })).toEqual("1.23");
    expect(await eth.getBalance({ address: key2.addr })).toEqual("0");
    expect(await eth.getBalance({ blockHeight: "latest" })).toEqual("1.23");
    expect(
      await eth.getBalance({ address: key1.addr, blockHeight: "latest" })
    ).toEqual("1.23");
    expect(
      await eth.getBalance({ address: key2.addr, blockHeight: "latest" })
    ).toEqual("0");

    expect(await eth.getBalance({ blockHeight: 12345678 })).toEqual("1");
    expect(
      await eth.getBalance({ address: key1.addr, blockHeight: 12345678 })
    ).toEqual("1");
    expect(
      await eth.getBalance({ address: key2.addr, blockHeight: 12345678 })
    ).toEqual("0.1");
  });
});
