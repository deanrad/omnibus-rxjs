import * as React from 'react';
import { Subscription } from 'rxjs';
import { initialState, searchService } from '../services/searchService';

function useWhileMounted(subsFactory: () => Subscription) {
  React.useEffect(() => {
    const subs = subsFactory();

    return () => subs.unsubscribe();
  }, []);
}

export function Viz() {
  const [blocks, setBlocks] = React.useState(initialState.blocks);
  useWhileMounted(() =>
    searchService.state.subscribe((s) => setBlocks(s.blocks))
  );

  return (
    <svg>
      {Object.entries(blocks).map(([_, block]) => {
        const { idx, status } = block;
        const length = '13%';
        const baseY = idx * 30;
        return (
          <g key={idx} className="concurrency-graph-tracker">
            <rect
              x="0.010090909090909091%"
              y={baseY}
              height="20px"
              width={length}
              stroke="black"
              fill="red"
              fillOpacity="0.3"
            ></rect>

            <text
              x="0.501%"
              y={baseY + 15}
              fill="red"
              fontSize="14"
              textDecoration="none"
              fontStyle="normal"
            >
              {status}
            </text>
            <line x1="0.001%" y1="0" x2="0.001%" y2="20" stroke="red"></line>
          </g>
        );
      })}
    </svg>
  );
}
