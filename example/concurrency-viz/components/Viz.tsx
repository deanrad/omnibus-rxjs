import * as React from 'react';
import merge from 'lodash.merge';
import { Subscription } from 'rxjs';
import {
  exampleState,
  animatedBlocks,
  blockService,
} from '../services/blockService';

import { BlockRect, BlockDisplay } from './Block';

function useWhileMounted(subsFactory: () => Subscription) {
  React.useEffect(() => {
    const subs = subsFactory();

    return () => subs.unsubscribe();
  }, []);
}

export function Viz() {
  const [blocks, setBlocks] = React.useState({});
  const [isActive, setIsActive] = React.useState(blockService.isActive.value);

  useWhileMounted(() => blockService.isActive.subscribe({ next: setIsActive }));
  // find out about new blocks
  useWhileMounted(() => {
    // TODO merge with elapsed stream instead
    return animatedBlocks.subscribe((newest) => {
      // console.log({ newest });
      // setBlocks((old) => merge(old, newest.blocks));
      setBlocks(newest.blocks);
    });
  });

  return (
    <div>
      <div>
        <a href="?immediate">Immediate</a> |<a href="?queueing">Queueing</a> |
        <a href="?replacing">Replacing</a> |<a href="?blocking">Blocking</a> |
        <a href="?toggling">Toggling</a> | <a href="?keepLatest">Keep Latest</a>
      </div>
      <div>isActive: {isActive ? '⏳' : ''} </div>
      <svg
        id="viz-display"
        viewBox="0 0 300 300"
        style={{ border: '1px solid black' }}
      >
        <defs key="defs">
          <pattern
            id="loading-1"
            width="8"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45 50 50)"
          >
            <line stroke="#a6a6a6" strokeWidth="7px" y2="10" />
          </pattern>
          <pattern
            id="loading-0"
            width="8"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-45 50 50)"
          >
            <line stroke="#a6a6a6" strokeWidth="7px" y2="10" />
          </pattern>
        </defs>
        {Object.entries(blocks).map(([_, block], i) =>
          React.createElement(BlockRect, { ...block, key: i })
        )}
      </svg>
    </div>
  );
}
