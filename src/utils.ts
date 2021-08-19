import {
  of,
  timer,
  Observable,
} from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> {}

export interface Thunk<T> {
  (): T;
}

function isObservable<T>(obj: any): obj is Observable<T> {
  return obj?.subscribe !== undefined;
}

/**
 * Returns an Observable of the value, or result of the function call, after
 * the number of milliseconds given. After is lazy and cancelable! So nothing happens until .subscribe
 * is called explicitly (via subscribe) or implicitly (toPromise(), await).
 * For a delay of 0, the function is executed synchronously when .subscribe is called.
 * @returns An Observable of the object or thunk return value. It is 'thenable', so may also be awaited directly.
 * ```
 * // Examples:
 * // awaited Promise
 * await after(100, () => new Date())
 * // unawaited Promise
 * after(100, () => new Date()).toPromise()
 * // unresolving Promise
 * after(Infinity, () => new Date()).toPromise()
 * ```
 */
export function after<T>(
  ms: number,
  objOrFn?: T | Thunk<T> | Observable<T>
): AwaitableObservable<T> {
  const delay = ms <= 0 
    ? of(0) : timer(ms);

  const resultMapper =
    typeof objOrFn === 'function'
      ? (objOrFn as (value: Number) => any)
      : () => objOrFn;

  // prettier-ignore
  const resultObs: Observable<T> = delay.pipe(
    isObservable<T>(objOrFn)
      ? mergeMap(() => objOrFn)
      : map(resultMapper)
  );

  // after is a 'thenable, thus usable with await.
  // ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
  // @ts-ignore
  resultObs.then = function (resolve, reject) {
    return resultObs.toPromise().then(resolve, reject);
  };

  return resultObs as AwaitableObservable<T>;
}
