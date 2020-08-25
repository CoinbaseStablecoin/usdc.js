import { Network } from "../network";
import { decodeABIValue, functionSelector } from "../util/abi";
import BN from "bn.js";
import { isValidAddress } from "../util";

/**
 * An ERC20 token
 */
export class ERC20 {
  /**
   * Constructor
   * @param contractAddress Contract address
   * @param decimals Number of decimal places
   * @param name (Default: null) Token name
   * @param symbol (Default: null) Token symbol
   * @param network (Default: Network.default) Network
   */
  public constructor(
    public readonly contractAddress: string,
    public readonly decimals: number,
    public readonly name: string | null = null,
    public readonly symbol: string | null = null,
    public readonly network: Network | null = Network.default
  ) {
    if (!isValidAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }
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
    if (!isValidAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }
    if (!network) {
      throw new Error("Network must be provided");
    }

    const [rawDecimals, rawName, rawSymbol] = await Promise.all(
      ["decimals()", "name()", "symbol()"].map((sel) =>
        network.callRPC("eth_call", [
          {
            to: contractAddress,
            data: functionSelector(sel),
          },
          "latest",
        ])
      )
    );

    const decimals = decodeABIValue<BN>("uint256", rawDecimals).toNumber();
    const name = decodeABIValue<string>("string", rawName);
    const symbol = decodeABIValue<string>("string", rawSymbol);

    return new ERC20(contractAddress, decimals, name, symbol, network);
  }
}
