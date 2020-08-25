import nock from "nock";
import { Network, ChainId } from "../network";
import { InvalidAddressError } from "../util";
import { ERC20 } from "./ERC20";
import { SELECTORS } from "./selectors";

describe("ERC20", () => {
  beforeEach(() => {
    nock.disableNetConnect();
    Network.setDefault("https://example.com/");
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test("constructor", () => {
    // Default network, and no metadata
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let erc20 = new ERC20("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6);
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

    const erc20 = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
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
});
