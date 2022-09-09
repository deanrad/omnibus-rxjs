import * as React from 'react';
import merge from 'lodash.merge';
import { timer, firstValueFrom, interval, Subscription, concat } from 'rxjs';
import { map, tap, takeUntil } from 'rxjs/operators';
import {
  exampleState,
  initialState,
  searchService,
  TOTAL_DURATION,
} from '../services/searchService';
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
  const [elapsed, setElapsed] = React.useState(0); // 0 to 100

  // tag requested with offsets
  React.useEffect(() => {
    setBlocks((old) => {
      const newer = {
        ...old,
      };
      Object.values<BlockDisplay>(newer).forEach((v) => {
        if (v.requestOffset === undefined) {
          v.requestOffset = elapsed;
        }
        // console.log({ v });
      });
      return newer;
    });
  }, [elapsed]);

  // find out about new blocks
  useWhileMounted(() => {
    // TODO merge with elapsed stream instead
    return searchService.state.subscribe((newest) =>
      setBlocks((old) => merge(old, newest.blocks))
    );
  });

  // from 0 to TOTAL_DURATION move the offset so new BlockRects are indeed offset
  useWhileMounted(() => {
    const UPDATE_INTERVAL = 500;
    const updater = concat(after(0, -1), interval(UPDATE_INTERVAL));
    let updaterSub: Subscription;

    const updates = updater.pipe(
      map((i) => i + 1),
      map((i) => (100 * (UPDATE_INTERVAL * i)) / TOTAL_DURATION),
      tap((percent) => {
        setElapsed(percent);
      }),
      takeUntil(timer(TOTAL_DURATION))
    );
    firstValueFrom(
      searchService.bus.query(searchService.actions.request.match)
    ).then(() => {
      updaterSub = updates.subscribe();
    });

    return new Subscription(() => updaterSub.unsubscribe());
  });

  return (
    <svg>
      {Object.entries(blocks).map(([_, block]) => {
        // (block as BlockDisplay).offset = elapsed;
        return React.createElement(BlockRect, block as BlockDisplay);
      })}
    </svg>
  );
}
