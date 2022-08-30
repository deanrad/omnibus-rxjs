import {
  createService,
  createSwitchingService,
  createQueueingService,
  createBlockingService as createSingletonService,
  Service,
} from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { queueOnlyLatest } from '../../../src';
export interface Block {
  idx: number;
  length: number;
  status: 'Running' | 'Requested' | 'Complete' | 'Canceled';
}
export interface GraphShape {
  blocks: Record<number, Block>;
}

export const initialState: GraphShape = {
  blocks: {},
};

export const exampleState: GraphShape = {
  blocks: {
    0: {
      idx: 0,
      length: 20,
      status: 'Complete',
    },
  },
};

export const searchService = createSingletonService<
  number,
  number,
  Error,
  GraphShape
>(
  'search',
  bus,
  (i) =>
    after(2000, i, {
      subscribe() {
        bus.trigger(searchService.actions.started(i));
      },
      unsubscribe() {
        bus.trigger(searchService.actions.canceled(i));
      },
    }),
  (ACs) =>
    (old = initialState, event) => {
      if (!event) return old;

      // update this clone instead
      const newBlocks = {
        ...old.blocks,
      };

      switch (event.type) {
        // A request for a new block
        case ACs?.request.type:
          newBlocks[event.payload] = {
            idx: event.payload,
            status: 'Requested',
            length: 10,
          };
          return { blocks: newBlocks };

        // The beginning of actual execution
        case ACs?.started.type:
          if (!event.payload) return old;

          newBlocks[event.payload] = {
            idx: event.payload,
            status: 'Running',
            length: 10,
          };
          return { blocks: newBlocks };

        // An update (occurs right before completion)
        case ACs?.next.type:
          newBlocks[event.payload].status = 'Complete';
          return { blocks: newBlocks };

        // A cancelation
        case ACs?.canceled.type:
          if (!event.payload) return old;

          newBlocks[event.payload].status = 'Canceled';
          return { blocks: newBlocks };

        default:
          return old;
      }
    }
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
