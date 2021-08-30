// @ts-nocheck
import {
  asapScheduler,
  asyncScheduler, concat, empty, EMPTY, Observable, of,
  throwError, timer
} from 'rxjs';
import { delay, map } from 'rxjs/operators';

// See https://dev.to/deanius/the-thresholds-of-perception-in-ux-435g
export const THRESHOLD = {
  Frame: 16,
  Frame60: 16,
  Frame90: 11,
  Unison: 10,
  Chorus: 25,
  MovieFrame: 42,
  Echo: 100,
  Blink: 150,
  TypingKey90: 150,
  AnimationShort: 200,
  TypingKey48: 250,
  Debounce: 330,
  TypingKeyMobile: 330,
  AnimationLong: 400,
  EDMBeat: 500,
  Thought: 1000,
  PageLoadMax: 2000,
  DeepBreath: 4000,
  Sentence: 5000
}

/** Observables consuming durations of time including sync,tick,promise,timeout */
export const DURATION = {
  // @ts-ignore
  Sync: (v?: unknown) => v,
  Promise: (v?: unknown) => Promise.resolve(v),
  Timeout: (v?: unknown) => new Promise(resolve => setTimeout(() => resolve(v), 0)),
}

/** AWAITABLE.Blink */
export const AWAITABLE = {
  Duration: (n: number, v?: unknown) => of(v).pipe(delay(n)),
  ...Object.keys(THRESHOLD).reduce((all, name) => {
    // @ts-ignore
    all[name] = () => AWAITABLE.Duration(THRESHOLD[name], 'name');
    return all;
  }, {} as { [key: string]: () => Observable<unknown> })

}

/** Concatenable Observables corresponding to DURATION.
 * Keyed off:
 *   V - a value (synchronous unless preceeded by t/T)
 *   E - an error
 *   t - a microtask tick (Promise resolution)
 *   T - a macrotask tick (setTimeout(fn,0))
 *   C - a completion
 */
export const EXECUTION = {
  V: () => of('V'),
  C: () => EMPTY,
  E: () => throwError(() => new Error('planned error')),
  t: () => empty(asapScheduler),
  T: () => empty(asyncScheduler)
}
type ExecKey = keyof [typeof EXECUTION]

/** Factory for Observable executions using mnemonics */
export const TestObservable = (code: string) => {
  const parts = code.split('')
  let all = EMPTY as Observable<unknown>;
  for (let part of parts) {
    all = concat(all, EXECUTION[part]())
    if (['C', 'E'].includes(part)) {
      return all;
    }
  }
  return all;
}

// #region After
interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> { }

export interface Thunk<T> {
  (): T;
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
    return resultObs.toPromise().then(resolve, reject);
  };

  return resultObs as AwaitableObservable<T>;
}
// #endregion