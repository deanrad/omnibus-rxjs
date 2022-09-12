import * as React from 'react';
import merge from 'lodash.merge';
import { timer, firstValueFrom, interval, Subscription, concat } from 'rxjs';
import { map, tap, takeUntil } from 'rxjs/operators';
import {
  exampleState,
  initialState,
  blockService,
  TOTAL_DURATION,
} from '../services/blockService';
import { after } from '../../../src/after';
import { BlockRect, BlockDisplay } from './Block';

function useWhileMounted(subsFactory: () => Subscription) {
  React.useEffect(() => {
    const subs = subsFactory();

    return () => subs.unsubscribe();
  }, []);
}

export function Viz() {
  const [blocks, setBlocks] = React.useState(exampleState.blocks);

  // find out about new blocks
  useWhileMounted(() => {
    // TODO merge with elapsed stream instead
    return blockService.state.subscribe((newest) =>
      setBlocks((old) => merge(old, newest.blocks))
    );
  });

  return (
    <svg>
      {Object.entries(blocks).map(([_, block]) =>
        React.createElement(BlockRect, block as BlockDisplay)
      )}
    </svg>
  );
}
