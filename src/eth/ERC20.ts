import { BlockHeight, Network } from "../network";
import BN from "bn.js";
import {
  bnFromDecimalString,
  decodeABIValue,
  decimalStringFromBN,
  ensureValidAddress,
  isHexString,
  strip0x,
} from "../util";
import { SELECTORS } from "./selectors";
import { rawEncode } from "../vendor/ethereumjs-abi";
import { UnsignedTransaction } from "./UnsignedTransaction";

/** ERC20 token */
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
   * @throws InvalidAddressError
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

  /**
   * Get balance of a given address
   * @param address Ethereum address
   * @param block (Default: "latest") Block height
   * @returns Balance in a string representation of a decimal number
   * @throws InvalidAddressError
   */
  public async balance(
    address: string,
    block: number | BlockHeight = BlockHeight.LATEST
  ): Promise<string> {
    if (!this.network) {
      throw new Error("Network is null");
    }
    address = ensureValidAddress(address);

    const result = await this.network.callRPC("eth_call", [
      {
        to: this.contractAddress,
        data:
          SELECTORS.balanceOf +
          rawEncode(["address"], [address]).toString("hex"),
      },
      block,
    ]);

    if (!isHexString(result)) {
      throw new Error("Invalid response");
    }
    const balance = new BN(strip0x(result), 16);

    return decimalStringFromBN(balance, this.decimalPlaces);
  }

  /**
   * Create an unsigned Ethereum transaction to send tokens to another address
   * @param recipientAddress Recipient's Ethereum address
   * @param amount Amount to send in a string representation of a decimal number
   * @returns Unsigned Ethereum transaction
   * @throws InvalidAddressError
   */
  public createTransfer(
    recipientAddress: string,
    amount: string
  ): UnsignedTransaction {
    recipientAddress = ensureValidAddress(recipientAddress);
    const value = bnFromDecimalString(amount, this.decimalPlaces);

    return new UnsignedTransaction({
      to: this.contractAddress,
      data:
        SELECTORS.transfer +
        rawEncode(["address", "uint256"], [recipientAddress, value]).toString(
          "hex"
        ),
    });
  }
}
