import BN from "bn.js";
import nock from "nock";
import { Network, ChainId } from "../network";
import { InvalidAddressError } from "../util";
import { ERC20 } from "./ERC20";
import { SELECTORS } from "./selectors";

describe("ERC20", () => {
  let erc20: ERC20;

  beforeEach(() => {
    nock.disableNetConnect();
    Network.setDefault("https://example.com/");

    erc20 = new ERC20(
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      18,
      "PeteCoin",
      "PTC"
    );
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test("constructor", () => {
    // Default network, and no metadata
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    erc20 = new ERC20("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6);
    expect(erc20.contractAddress).toEqual(
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    );
    expect(erc20.decimalPlaces).toEqual(6);
    expect(erc20.name).toBe(null);
    expect(erc20.symbol).toBe(null);
    expect(erc20.network).toEqual(Network.default);

    // Custom network and metadata
    const ropsten = new Network("https://example.com/ropsten", ChainId.ROPSTEN);
    erc20 = new ERC20(
      "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
      6,
      "USD Coin",
      "USDC",
      ropsten
    );
    expect(erc20.contractAddress).toEqual(
      "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"
    );
    expect(erc20.decimalPlaces).toEqual(6);
    expect(erc20.name).toBe("USD Coin");
    expect(erc20.symbol).toBe("USDC");
    expect(erc20.network).toEqual(ropsten);

    // Invalid contract address
    expect(() => new ERC20("0x", 18)).toThrow(InvalidAddressError);
  });

  test("at", async () => {
    const responses: Record<string, string> = {
      [SELECTORS.decimals]:
        "0x0000000000000000000000000000000000000000000000000000000000000006",
      [SELECTORS.name]:
        "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000855534420436f696e000000000000000000000000000000000000000000000000",
      [SELECTORS.symbol]:
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000",
    };

    Object.entries(responses).forEach(([selector, result]) => {
      nock("https://example.com")
        .matchHeader("content-type", "application/json")
        .matchHeader("accept", "application/json")
        .post("/", {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              data: selector,
            },
            "latest",
          ],
        })
        .reply(200, { result });
    });

    erc20 = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(erc20.contractAddress).toEqual(
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    );
    expect(erc20.decimalPlaces).toEqual(6);
    expect(erc20.name).toEqual("USD Coin");
    expect(erc20.symbol).toEqual("USDC");
    expect(erc20.network).toEqual(Network.default);

    // Invalid address
    await expect(ERC20.at("0x")).rejects.toThrow(InvalidAddressError);

    // No network
    await expect(
      ERC20.at("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", null)
    ).rejects.toThrow();
  });

  test("getBalance", async () => {
    const responses: Record<string, string> = {
      "0x70a08231000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa":
        "0x" + new BN("1000000000000000000").toString(16),
      "0x70a082310000000000000000000000001111111111111111111111111111111111111111":
        "0x" + new BN("12345678000000000000").toString(16),
    };
    Object.entries(responses).forEach(([data, result]) => {
      nock("https://example.com")
        .matchHeader("content-type", "application/json")
        .matchHeader("accept", "application/json")
        .post("/", {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            { to: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", data },
            "latest",
          ],
        })
        .reply(200, { result });
    });

    let bal = await erc20.getBalance(
      "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
    );
    expect(bal).toEqual("1");

    bal = await erc20.getBalance("0x1111111111111111111111111111111111111111");
    expect(bal).toEqual("12.345678");

    // Invalid address
    await expect(erc20.getBalance("0x")).rejects.toThrow(InvalidAddressError);
  });

  test("createTransfer", () => {
    let tx = erc20.createTransfer(
      "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
      "12.34"
    );

    expect(tx.to).toEqual(erc20.contractAddress);
    expect(tx.wei).toEqual(new BN(0));
    expect(tx.data.toString("hex")).toEqual(
      "a9059cbb000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000000000000000000000000000000000000000000000ab407c9eb0520000"
    );
    expect(tx.nonce).toBe(null);
    expect(tx.gasLimit).toBe(null);
    expect(tx.gasPrice).toBe(null);

    tx = erc20.createTransfer(
      "0x1111111111111111111111111111111111111111",
      ".00123"
    );
    expect(tx.to).toEqual(erc20.contractAddress);
    expect(tx.data.toString("hex")).toEqual(
      "a9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000045eadb112e000"
    );
    expect(tx.nonce).toBe(null);
    expect(tx.gasLimit).toBe(null);
    expect(tx.gasPrice).toBe(null);

    // Invalid address
    expect(() => erc20.createTransfer("0x", "1")).toThrow(InvalidAddressError);

    // Invalid amount
    expect(() => erc20.createTransfer("0x", "0x123")).toThrow(
      InvalidAddressError
    );
  });
});
