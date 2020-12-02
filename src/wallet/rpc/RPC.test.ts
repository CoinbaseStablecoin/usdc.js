import nock from "nock";
import { JSONRPCError } from "./types";
import { RPC } from "./RPC";

describe("RPC", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test("constructor", () => {
    let rpc = new RPC();
    expect(rpc.url).toEqual("");

    rpc = new RPC("http://localhost:8545");
    expect(rpc.url).toEqual("http://localhost:8545");
  });

  test("callMethod", async () => {
    nock("https://example.com")
      .matchHeader("content-type", "application/json")
      .matchHeader("accept", "application/json")
      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_hello",
        params: [123],
      })
      .reply(200, { result: "hi" });

    nock("https://example.com")
      .matchHeader("content-type", "application/json")
      .matchHeader("accept", "application/json")
      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_bye",
        params: ["so long"],
      })
      .reply(404, {
        error: {
          message: "method not found",
          code: -32601,
          data: { eth_bye: false },
        },
      });

    nock("https://example.com")
      .matchHeader("content-type", "application/json")
      .matchHeader("accept", "application/json")
      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "err",
        params: [],
      })
      .reply(500, "SERVER ERROR");

    nock("https://example.com")
      .matchHeader("content-type", "application/json")
      .matchHeader("accept", "application/json")
      .post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "hey",
        params: [],
      })
      .reply(200);

    // Result in JSON
    const rpc = new RPC("https://example.com/");
    const result = await rpc.callMethod<[number], string>("eth_hello", [123]);
    expect(result).toEqual("hi");

    // Error  inJSON
    let rpcError: JSONRPCError | null = null;
    try {
      await rpc.callMethod("eth_bye", ["so long"]);
    } catch (err) {
      rpcError = err;
    }
    expect(rpcError).toBeInstanceOf(JSONRPCError);
    expect(rpcError?.message).toEqual("method not found");
    expect(rpcError?.code).toEqual(-32601);
    expect(rpcError?.data).toEqual({ eth_bye: false });
    expect(rpcError?.httpStatus).toEqual(404);

    // Non-successful status code without an error in JSON
    try {
      await rpc.callMethod("err", []);
    } catch (err) {
      rpcError = err;
    }
    expect(rpcError).toBeInstanceOf(JSONRPCError);
    expect(rpcError?.message).toEqual("Internal Server Error");
    expect(rpcError?.code).toEqual(0);
    expect(await rpcError?.data).toBe(null);
    expect(rpcError?.httpStatus).toEqual(500);

    // Missing result
    try {
      await rpc.callMethod("hey", []);
    } catch (err) {
      rpcError = err;
    }
    expect(rpcError).toBeInstanceOf(JSONRPCError);
    expect(rpcError?.message).toEqual("Result missing");
    expect(rpcError?.code).toEqual(0);
    expect(await rpcError?.data).toBe(null);
    expect(rpcError?.httpStatus).toEqual(200);
  });
});
