import * as React from 'react';
import type { Block } from '../services/searchService';

export interface BlockDisplay extends Block {
  requestOffset: number;
  startedOffset: number;
  completedOffset: number;
}

const paddingLeft = 1;

export function BlockRect(props: BlockDisplay & { idx: number }) {
  const { idx, status, requestOffset } = props;
  const length = '13%';
  const baseY = idx * 30;

  return (
    <g key={idx}>
      <rect
        className="concurrency-graph-tracker"
        x={`${requestOffset ?? 0}%`}
        y={baseY}
        height="20px"
        width={length}
        stroke="black"
        fill="red"
        fillOpacity="0.3"
      ></rect>

      <text
        x={`${(requestOffset ?? 0) + paddingLeft}%`}
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
}
