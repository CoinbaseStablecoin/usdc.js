import nock from "nock";
import { Network, DEFAULT_USDC_CONTRACTS } from "./Network";
import { JSONRPCError } from "./types";

describe("Network", () => {
  beforeEach(() => {
    nock.disableNetConnect();
    Network.default = null;
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test("constructor", () => {
    let network = new Network("https://example.com/");
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.MAINNET);
    expect(network.usdcContractAddress).toEqual(
      DEFAULT_USDC_CONTRACTS[Network.ChainId.MAINNET]
    );

    network = new Network("https://example.com/", Network.ChainId.MAINNET);
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.MAINNET);
    expect(network.usdcContractAddress).toEqual(
      DEFAULT_USDC_CONTRACTS[Network.ChainId.MAINNET]
    );

    network = new Network("https://example.com/", Network.ChainId.ROPSTEN);
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.ROPSTEN);
    expect(network.usdcContractAddress).toEqual(
      DEFAULT_USDC_CONTRACTS[Network.ChainId.ROPSTEN]
    );

    network = new Network(
      "https://example.com/",
      Network.ChainId.ROPSTEN,
      "0x1111111111111111111111111111111111111111"
    );
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.ROPSTEN);
    expect(network.usdcContractAddress).toEqual(
      "0x1111111111111111111111111111111111111111"
    );

    expect(
      () => new Network("https://example.com/", Network.ChainId.ROPSTEN, "0x")
    ).toThrow();
  });

  test("setDefault", () => {
    let network = Network.setDefault("https://example.com/");
    expect(Network.default).toEqual(network);
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.MAINNET);
    expect(network.usdcContractAddress).toEqual(
      DEFAULT_USDC_CONTRACTS[Network.ChainId.MAINNET]
    );

    network = Network.setDefault(
      "https://example.com/",
      Network.ChainId.MAINNET
    );
    expect(Network.default).toEqual(network);
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.MAINNET);
    expect(network.usdcContractAddress).toEqual(
      DEFAULT_USDC_CONTRACTS[Network.ChainId.MAINNET]
    );

    network = Network.setDefault(
      "https://example.com/",
      Network.ChainId.ROPSTEN
    );
    expect(Network.default).toEqual(network);
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.ROPSTEN);
    expect(network.usdcContractAddress).toEqual(
      DEFAULT_USDC_CONTRACTS[Network.ChainId.ROPSTEN]
    );

    network = Network.setDefault(
      "https://example.com/",
      Network.ChainId.ROPSTEN,
      "0x1111111111111111111111111111111111111111"
    );
    expect(Network.default).toEqual(network);
    expect(network.ethereumRPCEndpoint).toEqual("https://example.com/");
    expect(network.chainId).toEqual(Network.ChainId.ROPSTEN);
    expect(network.usdcContractAddress).toEqual(
      "0x1111111111111111111111111111111111111111"
    );

    expect(() =>
      Network.setDefault("https://example.com/", Network.ChainId.ROPSTEN, "0x")
    ).toThrow();
  });

  test("setAsDefault", () => {
    const network = new Network("https://example.com/").setAsDefault();
    expect(Network.default).toEqual(network);
  });

  test("callRPC", async () => {
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
    const network = new Network("https://example.com/");
    const result = await network.callRPC<[number], string>("eth_hello", [123]);
    expect(result).toEqual("hi");

    // Error  inJSON
    let rpcError: JSONRPCError | null = null;
    try {
      await network.callRPC("eth_bye", ["so long"]);
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
      await network.callRPC("err", []);
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
      await network.callRPC("hey", []);
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
