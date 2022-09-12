import { createService, Service } from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { queueOnlyLatest, TapObserver } from '../../../src';
import { reducer, GraphShape } from './blockService.reducer';
export * from './blockService.reducer';
import { SINGLE_DURATION } from './constants';
import { animationService } from './animationService';

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

// on block creations, start the animation service (no more than one )
blockService.requests.subscribe({
  next(r) {
    animationService.request();
  },
});

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
