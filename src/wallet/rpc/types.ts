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
