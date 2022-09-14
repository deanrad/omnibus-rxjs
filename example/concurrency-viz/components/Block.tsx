import * as React from 'react';
import type { BlockDisplay } from '../services/blockService';
export * from '../services/blockService';

const paddingLeft = 4;
const boxHeight = 20;

export function BlockRect(props: BlockDisplay & { idx: number }) {
  const { idx, status, requestOffset, startedOffset, completedOffset, width } =
    props;

  const baseY = idx * 30;
  const color = 'red';
  return (
    <g key={idx}>
      {/* the requested process */}
      <line
        className="request-line"
        x1={`${requestOffset ?? 0}`}
        x2={`${requestOffset ?? 0}`}
        y1="0"
        y2="20"
        stroke="black"
      />
      <line
        className="waiting-line"
        x1={`${requestOffset ?? 0}`}
        x2={`${startedOffset ?? width}`}
        y1="20"
        y2="20"
        stroke="black"
      />
      {/* the running process */}
      <rect
        className={startedOffset ? '' : 'hidden'}
        x={`${startedOffset ?? 0}`}
        y={baseY}
        height={`${boxHeight}px`}
        width={width}
        stroke="black"
        fill="url(#loading-1)"
        fillOpacity="0.3"
      ></rect>
      {/* hide the end */}
      <rect
        className={completedOffset ? 'hidden' : ''}
        x={`${startedOffset + width}`}
        y={baseY}
        height={`${boxHeight}px`}
        width={1}
        stroke="white"
        fill={color}
      ></rect>
      {/* show cancelation */}
      {/* <rect
        className={(status === 'Canceled' ? '' : 'hidden') + ' cancel-line'}
        x={`${startedOffset + width}`}
        y={baseY}
        height={`${boxHeight}px`}
        width={1}
        stroke="gray"
      ></rect> */}
      
      <text
        x={`${(requestOffset ?? 0) + paddingLeft}`}
        y={baseY + boxHeight - 5}
        fill={color}
        fontSize="12"
        textDecoration="none"
        fontStyle="normal"
      >
        {status}
      </text>
    </g>
  );
}
