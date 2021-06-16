export type EXPECTED_ANY = any;

export enum PollingStatus {
  IDLE = "idle",
  POLLING = "polling",
  RETRY = "retry",
  ERROR = "error",
  TIMEOUT = "timeout",
}

export interface PollingState<D> {
  data: null | D;
  status: PollingStatus;
  running: boolean;
  delay: null | number;
  intervalIndex: null | number;
  pollCount: null | number;
  errors: Error[];
  retryAttempts: number;
}

export interface PollingOptions<D, R> {
  mapResponse?: (response: null | R, state: PollingState<D>) => D;
  isComplete?: (state: PollingState<D>) => boolean;
  maxAttempts?: number;
  maxPolls?: number;
  intervals?: number[];
  getRetryDelay?: (state: PollingState<D>) => number;
  timeout?: number;
  skip?: boolean;
}

export type CreateRequest<D, R> = (state: PollingState<D>) => Promise<R>;

export type PollingTuple<D> = [
  state: Pick<PollingState<D>, "data" | "status" | "pollCount" | "errors">,
  startPolling: () => void
];
