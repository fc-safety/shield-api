export class BaseWsException extends Error {
  public code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export class WsCloseNormalException extends BaseWsException {
  constructor(message: string) {
    super(message, 1000);
  }
}

export class WsClosePolicyViolationException extends BaseWsException {
  constructor(message: string) {
    super(message, 1008);
  }
}

export class WsCloseInternalException extends BaseWsException {
  constructor(message: string) {
    super(message, 1011);
  }
}
