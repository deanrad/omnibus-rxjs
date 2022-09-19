import { createBlockingService, Service } from '../../../src/createService';
import { after } from '../../../src/after';
import { bus } from './bus';
import { TOTAL_DURATION } from './constants';
import { animationFrames, concat, interval } from 'rxjs';
import { takeWhile, scan, map, takeUntil, retry } from 'rxjs/operators';

const XSCALE = 2.5; // 100 percent => 250 pixels

function moveFrames(duration) {
  return animationFrames().pipe(
    takeWhile(({ elapsed }) => elapsed < duration),
    map(({ elapsed }) => {
      const percent = (elapsed / duration) * XSCALE;
      return {
        percent,
      };
    })
  );
}

//
const handler = () => moveFrames(TOTAL_DURATION);

export const animationService = createBlockingService<
  void,
  { percent: number },
  Error,
  number
>('ani', bus, handler);
