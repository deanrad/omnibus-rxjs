import {
  createService,
  createSwitchingService,
  createQueueingService,
  createBlockingService,
  createTogglingService,
  Service,
} from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { queueOnlyLatest, TapObserver } from '../../../src';
import {
  reducer,
  GraphShape,
  BlockDisplay,
  Block,
} from './blockService.reducer';
export * from './blockService.reducer';
import { SINGLE_DURATION } from './constants';
import { animationService } from './animationService';
import { combineLatest, concat, fromEvent, Subscription } from 'rxjs';
import { map, scan, switchMap, tap, takeUntil } from 'rxjs/operators';
import merge from 'lodash.merge';

// Started and complete dont usually have payloads to identify the request
// that caused them so this observer will add some
function includeRequestNumber<T>(idx: T) {
  return {
    subscribe() {
      bus.trigger(blockService.actions.next({ subtype: 'Started', idx }));
    },
    unsubscribe() {
      bus.trigger(blockService.actions.next({ subtype: 'Canceled', idx }));
    },
  } as Partial<TapObserver<T>>;
}

let serviceFactory: typeof createSwitchingService;
const q = document.location.search.substring(1);
switch (q) {
  case 'queueing':
    serviceFactory = createQueueingService;
    break;
  case 'blocking':
    serviceFactory = createBlockingService;
    break;
  case 'toggling':
    serviceFactory = createTogglingService;
    break;
  case 'replacing':
    serviceFactory = createSwitchingService;
    break;
  case 'keepLatest':
    serviceFactory = createKeepLatestService;
    break;
  case 'immediate':
  default:
    serviceFactory = createService;
    break;
}

export const blockService = serviceFactory<number, number, Error, GraphShape>(
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

// for visualization purposes, we need to denote requests that wont start
// by canceling them right away
let vizFilter = new Subscription();
if (['blocking', 'toggling'].includes(q)) {
  vizFilter = bus.guard(blockService.actions.request.match, ({ payload }) => {
    if (blockService.isActive.value) {
      after(Promise.resolve(), () => {
        bus.trigger(
          blockService.actions.next({ subtype: 'Dropped', idx: payload })
        );
      }).subscribe();
    }
  });
} else if (q === 'keepLatest') {
  vizFilter = bus.guard(blockService.actions.request.match, ({ payload }) => {
    // if the previous one is pending
    const prev = payload - 1;
    if (blockService.state.value.blocks[prev]?.status === 'Requested') {
      after(Promise.resolve(), () => {
        bus.trigger(
          blockService.actions.next({ subtype: 'Dropped', idx: prev })
        );
      }).subscribe();
    }
  });
} else {
  vizFilter?.unsubscribe();
}

const updateOffsets = (last, [{ blocks }, timeEvent]) => {
  const currentOffset = timeEvent.payload.percent * 100;
  const newBlocks = merge({ blocks: {} }, last, { blocks });

  Object.values<BlockDisplay>(newBlocks.blocks).forEach((b) => {
    if (b.status === 'Requested') {
      b.requestOffset ?? (b.requestOffset = currentOffset);
    }
    if (b.status === 'Running') {
      b.requestOffset ?? (b.requestOffset = currentOffset);
      b.startedOffset ?? (b.startedOffset = currentOffset);
    }
    if (b.status === 'Completed' && b.completedOffset === undefined) {
      b.completedOffset ?? (b.completedOffset = currentOffset);
    }
    if (
      ['Canceled', 'Dropped'].includes(b.status) &&
      b.canceledOffset === undefined
    ) {
      b.canceledOffset ?? (b.canceledOffset = currentOffset);
    }
    if (!['Canceled', 'Completed', 'Dropped'].includes(b.status)) {
      b.width = currentOffset - (b.startedOffset ?? b.requestOffset);
    }
    // if (!['Canceled', 'Completed', 'Dropped'].includes(b.status)) {
    //   b.width = currentOffset;
    // }
  });
  return newBlocks;
};

// debugging
// the real frames
const animationFrames = bus.query(animationService.actions.next.match);
// some slowed down ones
// const animationFrames = bus
//   .query(animationService.actions.request.match)
//   .pipe(
//     switchMap(() =>
//       concat(
//         ...[0, 0.25, 0.5, 1].map((d) =>
//           after(d * 1000, { payload: { percent: d } })
//         )
//       )
//     )
//   );

export const animatedBlocks = combineLatest([
  blockService.state,
  animationFrames,
]).pipe(
  scan(updateOffsets, { blocks: {} }),
  takeUntil(fromEvent(document.getElementById('viz'), 'click'))
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
