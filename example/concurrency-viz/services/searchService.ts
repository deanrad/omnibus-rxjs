import {
  createService,
  createSwitchingService,
  createQueueingService,
  createBlockingService as createSingletonService,
  Service,
} from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { queueOnlyLatest, TapObserver } from '../../../src';
import { reducer, GraphShape } from './searchService.reducer';
export * from './searchService.reducer';

export const SINGLE_DURATION = 2000;
export const TOTAL_DURATION = 5000;

// Started and complete dont usually have payloads to identify the request
// that caused them so this observer will
function includeRequestNumber<T>(i: T) {
  return {
    subscribe() {
      bus.trigger(searchService.actions.started(i));
    },
    unsubscribe() {
      bus.trigger(searchService.actions.canceled(i));
    },
  } as Partial<TapObserver<T>>;
}

export const searchService = createService<number, number, Error, GraphShape>(
  'search',
  bus,
  (i) =>
    // a single process which notifies on all lifecycles (subscribe)
    after(SINGLE_DURATION, i, includeRequestNumber(i)),
  reducer
);

export const actions = searchService.actions;

/** A strategy from ember-concurrency! */
function createKeepLatestService<TRequest, TNext, TError, TState>(
  ...args
): Service<TRequest, TNext, TError, TState> {
  return createService(
    // @ts-ignore
    ...args,
    queueOnlyLatest
  );
}
