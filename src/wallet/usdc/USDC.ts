import { RPC } from "../rpc";
import { Account } from "../Account";
import { ERC20 } from "../erc20";

export class USDC extends ERC20 {
  private __chainId?: number;
  private _contractAddressOverridden = false;

  /**
   * Constructor. Most users should get an instance of this class by calling the
   * `usdc` method in Wallet class, instead of constructing one manually.
   * @param account Account object
   * @param rpc RPC object
   */
  public constructor(account: Account, rpc: RPC) {
    super(account, rpc, "", 6);
  }

  /**
   * Override the contract address. Useful for custom deployments.
   * @param address USDC Contract Address
   */
  public overrideContractAddress(address: string): void {
    this.__contractAddress = address;
    this._contractAddressOverridden = true;
  }

  /**
   * Account object
   */
  public get account(): Account {
    return this._account;
  }

  /**
   * RPC object
   */
  public get rpc(): RPC {
    return this._rpc;
  }

  /**
   * Get the contract address. Returns different contract addresses depending on
   * the chain ID.
   * @returns A promise that resolves to a contract address
   */
  public async getContractAddress(): Promise<string> {
    if (this._contractAddressOverridden) {
      return this.__contractAddress;
    }

    const chainId = await this._rpc.getChainId();

    if (!this.__contractAddress || chainId !== this.__chainId) {
      this.__chainId = chainId;

      switch (chainId) {
        case 1: // Mainnet
          this.__contractAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
          break;
        case 3: // Ropsten
          this.__contractAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
          break;
        case 4: // Rinkeby
          this.__contractAddress = "0x705de9dc3ad85e072ab34cf6850e6b2bd317ccc1";
          break;
        case 5: // Goerli
          this.__contractAddress = "0x2f3a40a3db8a7e3d09b0adfefbce4f6f81927557";
          break;
        case 137: // Matic
          this.__contractAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
          break;
        case 80001: // Mumbai
          this.__contractAddress = "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747";
          break;
        default:
          throw new Error(`Unknown chain ID: ${chainId}`);
      }
    }
    return this.__contractAddress;
  }
}
