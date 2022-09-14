import * as React from 'react';
import merge from 'lodash.merge';
import { Subscription } from 'rxjs';
import { exampleState, animatedBlocks } from '../services/blockService';

import { BlockRect, BlockDisplay } from './Block';

function useWhileMounted(subsFactory: () => Subscription) {
  React.useEffect(() => {
    const subs = subsFactory();

    return () => subs.unsubscribe();
  }, []);
}

export function Viz() {
  const [blocks, setBlocks] = React.useState({});

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
    <svg id="viz-display" style={{ border: '1px solid black' }}>
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
  );
}
