import { createBlockingService, Service } from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { TOTAL_DURATION } from './constants';
import { animationFrames, concat, interval } from 'rxjs';
import { takeWhile, scan, map, takeUntil } from 'rxjs/operators';

const deltaReducer = [
  (prev, { elapsed }) => {
    const last = prev.last || performance.now();
    return {
      last: performance.now(),
      delta: performance.now() - last,
    };
  },
  { delta: 0 },
];

function moveFrames(duration) {
  return animationFrames().pipe(
    takeWhile(({ elapsed }) => elapsed < duration),
    map(({ elapsed }) => {
      const percent = elapsed / duration;
      return {
        percent,
      };
    })
  );
}

//
const handler = () => moveFrames(5000);

export const animationService = createBlockingService<
  void,
  { percent: number },
  Error,
  number
>('ani', bus, handler);
