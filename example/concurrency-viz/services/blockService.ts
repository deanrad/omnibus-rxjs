import { createService, Service } from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { queueOnlyLatest, TapObserver } from '../../../src';
import { reducer, GraphShape, BlockDisplay } from './blockService.reducer';
export * from './blockService.reducer';
import { SINGLE_DURATION } from './constants';
import { animationService } from './animationService';
import { combineLatest, concat } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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
  'block',
  bus,
  (i) =>
    // a single process which notifies on all lifecycles (subscribe)
    after(SINGLE_DURATION, i, includeRequestNumber(i)),
  reducer
);

// on block creations, start the animation service (no more than one )
blockService.requests.subscribe({
  next(r) {
    animationService.request();
  },
});

// debugging
const slowFrames = concat(
  ...[0, 0.25, 0.5, 1].map((d) => after(d * 1000, { payload: { percent: d } }))
);
export const animatedBlocks = combineLatest([
  blockService.state.pipe(tap((s) => console.log(JSON.stringify(s)))),
  slowFrames,
  // bus.query(animationService.actions.next.match),
]).pipe(
  map(([{ blocks: b }, t]) => {
    const newBlocks = JSON.parse(JSON.stringify(b));

    Object.values<BlockDisplay>(newBlocks).forEach((v, i) => {
      if (v.status === 'Running') {
        v.width = t.payload.percent * 100;
        if (!v.startedOffset) {
          v.startedOffset = 20; // t.payload.percent * 100;
        }
      }
    });

    return { blocks: newBlocks };
  })
);

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
