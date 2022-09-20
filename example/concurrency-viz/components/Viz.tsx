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

  useWhileMounted(() =>
    blockService.isActive.subscribe({
      next(isActive) {
        const classes = document.getElementById('activity')?.classList;
        isActive ? classes?.remove('viz-hidden') : classes?.add('viz-hidden');
      },
    })
  );
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
        <a href="?immediate">Immediate</a> |<a href="?queueing">Queued</a> (
        <a href="?max-2">2 concurrent</a>) |<a href="?replacing">Replacing</a> |
        <a href="?blocking">Blocking</a> |<a href="?toggling">Toggling</a> |{' '}
        <a href="?keepLatest">Keep Latest</a>
      </div>

      <svg
        id="viz-display"
        viewBox="-10 -15 300 300"
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
        <line
          className="time-mark-line"
          x1={0}
          x2={190}
          y1={-8.5}
          y2={-8.5}
          stroke="#ccc"
        />
        <line
          className="time-mark-line"
          x1={187}
          x2={190}
          y1={-10}
          y2={-8.5}
          stroke="#ccc"
        />
        <text x={191} y={-8} fontStyle="italic" fontSize={6} fill="#ccc">
          time
        </text>
        {Object.entries(blocks).map(([_, block], i) =>
          React.createElement(BlockRect, { ...block, key: i })
        )}
      </svg>
    </div>
  );
}
