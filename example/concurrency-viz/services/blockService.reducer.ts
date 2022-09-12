import { ActionCreators } from '../../../src';

export interface Block {
  idx: number;
  status: 'Running' | 'Requested' | 'Complete' | 'Canceled';
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

export const exampleState: GraphShape = {
  blocks: {
    0: {
      idx: 0,
      status: 'Complete',
      requestOffset: 0,
      width: 20 * 5, // percent*pixels
    },
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
  };
