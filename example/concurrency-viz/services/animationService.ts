import { createBlockingService, Service } from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { TOTAL_DURATION } from './constants';
import { animationFrames } from 'rxjs';
import { takeWhile, scan, map } from 'rxjs/operators';

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

export const animationService = createBlockingService<
  void,
  {percent: number},
  Error,
  number
>('search', bus, () => moveFrames(TOTAL_DURATION));
