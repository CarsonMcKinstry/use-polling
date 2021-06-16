/* constants */

import { PollingState } from "./types";

export const defaultIntervals = [400, 1000, 1500, 1500, 2000, 2000, 4000, 6000];

export const baseDelay = 250;

/* defaults */

export const defaultIsComplete = () => false;

export const defaultGetRetryDelay = ({ retryAttempts }: PollingState<any>) => {
  return Math.pow(2, retryAttempts) * baseDelay;
};

export const defaultMapResponse = (i: any) => i;

export const defaultTimeout = 0;
