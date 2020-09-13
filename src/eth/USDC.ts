import { Network } from "../network";
import { ERC20 } from "./ERC20";

export class USDC extends ERC20 {
  /**
   * Create a USDC object with the contract address defined in the network and
   * the default USDC metadata.
   * @param network (Default: Network.default) Network
   * @returns USDC object
   */
  public static for(network: Network | null = Network.default): USDC {
    if (!network) {
      throw new Error("Network must be provided");
    }
    if (!network.usdcContractAddress) {
      throw new Error("USDC contract address is not defined in network");
    }
    return new USDC(
      network.usdcContractAddress,
      6,
      "USD Coin",
      "USDC",
      network
    );
  }

  /**
   * Create a USDC object with metadata fetched from the network. Most users
   * should use `USDC.for()` instead.
   * @param contractAddress Contract address
   * @param network (Default: Network.default) Network
   * @returns USDC object
   */
  public static async at(
    contractAddress: string,
    network: Network | null = Network.default
  ): Promise<USDC> {
    const erc20 = await ERC20.at(contractAddress, network);
    return new USDC(
      erc20.contractAddress,
      erc20.decimalPlaces,
      erc20.name,
      erc20.symbol,
      network
    );
  }
}
