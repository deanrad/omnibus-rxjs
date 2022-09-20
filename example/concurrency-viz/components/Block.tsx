import * as React from 'react';
import type { BlockDisplay } from '../services/blockService';
export * from '../services/blockService';

const wordPadding = 4;
const boxHeight = 18;

export function BlockRect(props: BlockDisplay & { idx: number }) {
  const { idx, status, requestOffset, startedOffset, completedOffset, width } =
    props;

  const baseY = idx * (boxHeight + 5);
  const color = 'black';
  const isRunning = typeof startedOffset === 'number';

  return (
    <g key={idx}>
      {/* event label */}
      <text
        x={requestOffset - 3}
        y={-5}
        fill={color}
        fontSize="10"
        textDecoration="none"
        fontStyle="normal"
      >
        ✶
      </text>
      {/* the requested process */}
      <line
        className="request-line"
        x1={`${requestOffset || 0}`}
        x2={`${requestOffset || 0}`}
        y1={baseY}
        y2={baseY + boxHeight}
        stroke="black"
      />
      <line
        className="waiting-line"
        x1={`${requestOffset}`}
        x2={`${isRunning ? startedOffset : requestOffset + width}`}
        y1={baseY + boxHeight}
        y2={baseY + boxHeight}
        stroke="black"
      />
      {/* the running process */}
      <rect
        className={(isRunning ? '' : 'hidden') + ' process-box'}
        x={`${startedOffset ?? 0}`}
        y={baseY}
        height={`${boxHeight}px`}
        width={width}
        stroke="black"
        fill={`url(#loading-${idx % 2})`}
        fillOpacity="0.3"
      ></rect>
      {/* hide the end */}
      <rect
        className={(completedOffset ? 'hidden' : '') + ' end-line'}
        x={`${(startedOffset ?? 0) + (width ?? 0)}`}
        y={baseY}
        height={`${boxHeight}px`}
        width={1}
        stroke="white"
        fill={color}
      ></rect>
      {/* show cancelation */}
      <rect
        className={(status === 'Canceled' ? '' : 'hidden') + ' cancel-line'}
        x={`${(startedOffset ?? 0) + (width ?? 0) - 1}`}
        y={baseY - 3}
        height={`${boxHeight + 6}px`}
        width={2}
      ></rect>
      {/* status label */}
      <text
        x={`${(requestOffset ?? 0) + wordPadding}`}
        y={baseY + boxHeight - 5}
        fill={color}
        fontSize="10"
        textDecoration="none"
        fontStyle="normal"
      >
        {status === 'Requested' ? 'Queued' : status}
      </text>
    </g>
  );
}
