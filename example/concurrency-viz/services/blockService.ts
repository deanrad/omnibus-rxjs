import {
  createService,
  createSwitchingService,
  createQueueingService,
  createBlockingService as createSingletonService,
  Service,
} from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import {
  HandlerReturnValue,
  Omnibus,
  queueOnlyLatest,
  TapObserver,
} from '../../../src';
import { reducer, GraphShape } from './blockService.reducer';
import { Action } from 'typescript-fsa';
export * from './blockService.reducer';

export const SINGLE_DURATION = 2000;
export const TOTAL_DURATION = 5000;

// Started and complete dont usually have payloads to identify the request
// that caused them so this observer will
function includeRequestNumber<T>(i: T) {
  return {
    subscribe() {
      bus.trigger(blockService.actions.started(i));
    },
    unsubscribe() {
      bus.trigger(blockService.actions.canceled(i));
    },
  } as Partial<TapObserver<T>>;
}

export const blockService = createService<number, number, Error, GraphShape>(
  'search',
  bus,
  (i) =>
    // a single process which notifies on all lifecycles (subscribe)
    after(SINGLE_DURATION, i, includeRequestNumber(i)),
  reducer
);

export const actions = blockService.actions;

/** A strategy from ember-concurrency! */
function createKeepLatestService<TRequest, TNext, TError, TState>(
  ...args: Parameters<typeof createService>
): Service<TRequest, TNext, TError, TState> {
  const [ns, bus, handler, reducerProducer] = args;

  return createService<TRequest, TNext, TError, TState>(
    ns,
    // @ts-ignore
    bus,
    handler,
    reducerProducer,
    queueOnlyLatest
  );
}
