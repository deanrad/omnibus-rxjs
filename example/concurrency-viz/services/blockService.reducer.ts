import { ActionCreators } from '../../../src';

export interface Block {
  idx: number;
  status: 'Running' | 'Requested' | 'Completed' | 'Canceled';
}
export interface BlockDisplay extends Block {
  requestOffset: number;
  startedOffset?: number;
  completedOffset?: number;
  canceledOffset?: number;
  width: number;
}

export interface GraphShape {
  blocks: Record<number, BlockDisplay>;
}

export const initialState: GraphShape = {
  blocks: {},
};

const COMPLETED: BlockDisplay = {
  idx: 0,
  status: 'Completed',
  requestOffset: 20,
  startedOffset: 20,
  completedOffset: 80,
  width: 60,
};
const REQUESTED = {
  idx: 2,
  status: 'Requested',
  requestOffset: 20,
  // startedOffset: 40,
  // completedOffset: 80,
  width: 30,
};

const RUNNING: BlockDisplay = {
  idx: 1,
  status: 'Running',
  requestOffset: 40,
  startedOffset: 40,
  width: 40,
};

const CANCELED: BlockDisplay = {
  idx: 3,
  status: 'Canceled',
  requestOffset: 40,
  startedOffset: 40,
  width: 60,
};

const EVERYTHING: BlockDisplay = {
  idx: 4,
  status: 'Completed',
  requestOffset: 20,
  startedOffset: 40,
  completedOffset: 80,
  width: 40,
};
export const exampleState: GraphShape = {
  blocks: {
    0: COMPLETED,
    1: RUNNING,
    2: REQUESTED,
    3: CANCELED,
    4: EVERYTHING,
  },
};

export const reducer =
  (ACs?: ActionCreators<number, number, Error>) =>
  (old = exampleState, event) => {
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
        };
        return { blocks: newBlocks };

      // The beginning of actual execution
      case ACs?.started.type:
        if (!event.payload) return old;

        newBlocks[event.payload] = {
          idx: event.payload,
          status: 'Running',
        };
        return { blocks: newBlocks };

      // An update (occurs right before completion)
      case ACs?.next.type:
        newBlocks[event.payload].status = 'Completed';
        return { blocks: newBlocks };

      // A cancelation
      case ACs?.canceled.type:
        if (!event.payload) return old;

        newBlocks[event.payload].status = 'Canceled';
        return { blocks: newBlocks };

      default:
        return old;
    }
  };
