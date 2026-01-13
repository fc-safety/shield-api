// Mock for p-retry

interface RetryOptions {
  retries?: number;
  onFailedAttempt?: (
    error: Error & { attemptNumber: number; retriesLeft: number },
  ) => void;
  shouldRetry?: (error: Error) => boolean;
}

const pRetry = async <T>(
  fn: (attemptNumber: number) => Promise<T> | T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: RetryOptions,
): Promise<T> => {
  // Just execute the function once without retrying in tests
  return fn(1);
};

export default pRetry;

export class AbortError extends Error {
  readonly originalError?: Error;

  constructor(message: string | Error) {
    super(typeof message === 'string' ? message : message.message);
    this.name = 'AbortError';
    if (typeof message !== 'string') {
      this.originalError = message;
    }
  }
}
