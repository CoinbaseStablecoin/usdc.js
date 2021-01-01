export class JSONRPCError<Data = any> extends Error {
  public constructor(
    public readonly message: string,
    public readonly code: number,
    public readonly data: Data,
    public readonly httpStatus: number
  ) {
    super(message);
    Object.setPrototypeOf(this, JSONRPCError.prototype);
    this.name = "JSONRPCError";
  }
}

export interface JSONRPCResponse<T> {
  result?: T;
  error?: { message: string; code: number; data?: any };
}

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  cumulativeGasUsed: number;
  gasUsed: number;
  contractAddress: string | null;
  logs: {
    logIndex: number;
    address: string;
    data: string;
    topics: string[];
  }[];
  logsBloom: string;
  status: boolean;
}

export class TimeoutError extends Error {
  public constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, TimeoutError.prototype);
    this.name = "TimeoutError";
  }
}
