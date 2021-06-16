import { useMemo, useState, useRef, useEffect, useCallback } from "react";

import {
  PollingStatus,
  PollingState,
  PollingOptions,
  CreateRequest,
  PollingTuple,
} from "./types";

import {
  defaultIntervals,
  baseDelay,
  defaultIsComplete,
  defaultGetRetryDelay,
  defaultMapResponse,
  defaultTimeout,
} from "./constants";

import { wait } from "./utils";

export function usePolling<D, R>(
  createRequest: CreateRequest<D, R>,
  options: PollingOptions<D, R> = {}
): PollingTuple<D> {
  const {
    mapResponse = defaultMapResponse,
    isComplete = defaultIsComplete,
    maxAttempts = 3,
    maxPolls = 6,
    intervals = defaultIntervals,
    getRetryDelay = defaultGetRetryDelay,
    timeout = defaultTimeout,
    skip = false,
  } = options;
  const defaultState = useMemo(
    () => ({
      data: null,
      status: PollingStatus.IDLE,
      running: false,
      delay: null,
      intervalIndex: null,
      pollCount: null,
      errors: [],
      retryAttempts: 0,
    }),
    []
  );

  const [state, setState] = useState<PollingState<D>>(defaultState);
  const startTime = useRef(Date.now());

  const getIntervalIndex = useCallback(
    (state: PollingState<D>) => {
      const { intervalIndex, pollCount } = state;

      if (pollCount === null) {
        return null;
      }

      if (intervalIndex === null) {
        return 0;
      }

      return Math.min(intervalIndex + 1, intervals.length - 1);
    },
    [intervals]
  );

  const update = useCallback(
    (state: PollingState<D>) => {
      const { status } = state;

      if (status === PollingStatus.RETRY) {
        return {
          ...state,
          intervalIndex: 0,
          delay: getRetryDelay(state),
        };
      }

      const intervalIndex = getIntervalIndex(state);
      const delay = intervalIndex === null ? 0 : intervals[intervalIndex];

      return {
        ...state,
        intervalIndex,
        delay,
      };
    },
    [getIntervalIndex, getRetryDelay, intervals]
  );

  const request = useCallback(async () => {
    if (skip) return;
    const nextState = update(state);

    const { status, retryAttempts, pollCount } = nextState;

    if (
      [PollingStatus.IDLE, PollingStatus.TIMEOUT, PollingStatus.ERROR].includes(
        status
      )
    ) {
      setState({
        ...nextState,
        running: false,
      });
      return;
    }

    if (isComplete(nextState)) {
      setState({
        ...nextState,
        status: PollingStatus.IDLE,
      });
      return;
    }

    if (status === PollingStatus.RETRY && retryAttempts >= maxAttempts) {
      setState((s) => ({
        ...nextState,
        status: PollingStatus.ERROR,
        errors: [
          ...s.errors,
          new Error("Max attempts exceeded due to errors in the data provider"),
        ],
      }));
      return;
    }

    if (pollCount && pollCount >= maxPolls) {
      setState((s) => ({
        ...nextState,
        status: PollingStatus.ERROR,
        errors: [...s.errors, new Error("Max polls exceeded")],
      }));
      return;
    }

    if (timeout > 0 && Date.now() - startTime.current > timeout) {
      setState((s) => ({
        ...nextState,
        status: PollingStatus.ERROR,
        errors: [...s.errors, new Error("Polling timeout exceeded")],
      }));
      return;
    }

    await wait(nextState.delay);

    try {
      const response = await createRequest(nextState);

      setState({
        ...nextState,
        data: mapResponse(response, state),

        status: PollingStatus.POLLING,
        pollCount: pollCount === null ? 0 : pollCount + 1,
        retryAttempts: 0,
      });
      return;
    } catch (err) {
      setState({
        ...nextState,
        data: mapResponse(null, state),
        status: PollingStatus.RETRY,
        retryAttempts: retryAttempts + 1,
        errors: nextState.errors.concat(err),
      });
    }
  }, [
    createRequest,
    maxAttempts,
    maxPolls,
    isComplete,
    mapResponse,
    state,
    timeout,
    update,
    skip,
  ]);

  useEffect(() => {
    if (state.running) {
      request();
    }
  }, [request, state.running]);

  const { data, errors, pollCount, status } = state;

  const startPolling = () => {
    if (!state.running) {
      setState({
        ...defaultState,
        status: PollingStatus.POLLING,
        running: true,
      });
    }
  };

  return [
    {
      data,
      status,
      errors,
      pollCount,
    },
    startPolling,
  ];
}
