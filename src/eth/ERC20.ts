import { Network } from "../network";
import { decodeABIValue } from "../util/abi";
import BN from "bn.js";
import { ensureValidAddress } from "../util";
import { SELECTORS } from "./selectors";

/**
 * An ERC20 token
 */
export class ERC20 {
  /**
   * Constructor
   * @param contractAddress Contract address
   * @param decimalPlaces Number of decimal places
   * @param name (Default: null) Token name
   * @param symbol (Default: null) Token symbol
   * @param network (Default: Network.default) Network
   */
  public constructor(
    public readonly contractAddress: string,
    public readonly decimalPlaces: number,
    public readonly name: string | null = null,
    public readonly symbol: string | null = null,
    public readonly network: Network | null = Network.default
  ) {
    this.contractAddress = ensureValidAddress(contractAddress);
  }

  /**
   * Create an ERC20 object with metadata fetched from the network
   * @param contractAddress Contract address
   * @param network (Default: Network.default) Network
   * @returns ERC20 object
   */
  public static async at(
    contractAddress: string,
    network: Network | null = Network.default
  ): Promise<ERC20> {
    if (!network) {
      throw new Error("Network must be provided");
    }
    contractAddress = ensureValidAddress(contractAddress);

    const [rawDecimals, rawName, rawSymbol] = await Promise.all(
      [SELECTORS.decimals, SELECTORS.name, SELECTORS.symbol].map((selector) =>
        network.callRPC("eth_call", [
          { to: contractAddress, data: selector },
          "latest",
        ])
      )
    );

    const decimalPlaces = decodeABIValue<BN>("uint256", rawDecimals).toNumber();
    const name = decodeABIValue<string>("string", rawName);
    const symbol = decodeABIValue<string>("string", rawSymbol);

    return new ERC20(contractAddress, decimalPlaces, name, symbol, network);
  }
}
