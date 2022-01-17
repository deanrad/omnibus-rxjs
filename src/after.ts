import { firstValueFrom, Observable, of, timer } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> {}

export interface Thunk<T> {
  (): T;
}
/**
 * `after` is a composable `setTimeout`, based on Observables.
 * `after` returns an Observable of the value, or result of the function call, after the number of milliseconds given.
 * For a delay of 0, the function is executed synchronously when `.subscribe()` is called.
 * `after` is 'thenable' - and can be awaited like a Promise.
 * However, since underneath it is an Observable, `after` is both lazy and cancelable!
 *
 * @returns An Observable of the object or thunk return value, which can be the target of an `await`.
 */
export function after<T>(
  ms: number,
  objOrFn?: T | Thunk<T> | Observable<T>
): AwaitableObservable<T> {
  const delay = ms <= 0 ? of(0) : timer(ms);

  const resultMapper =
    typeof objOrFn === 'function'
      ? (objOrFn as (value: Number) => any)
      : () => objOrFn;

  function isObservable<T>(obj: any): obj is Observable<T> {
    return obj?.subscribe !== undefined;
  }
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
    return firstValueFrom(resultObs).then(resolve, reject);
  };

  return resultObs as AwaitableObservable<T>;
}
// #endregion
