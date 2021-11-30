// @ts-nocheck
import { Observable, of, from } from 'rxjs';
import { delay, mergeAll } from 'rxjs/operators';

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
  Sentence: 6000,
};

/**
 * Flattens a Promise for an array to an Observable of its
 * individual items. `next` notifications arrive all at the end.
 * Canceling the Observable will prevent any next/complete
 * notifications, but will not abort the underlying Promise.
 */
export function observableFromPromisedArray<T>(pa: Promise<Array<T>>) {
  return from(pa).pipe(mergeAll());
}

/** Observables consuming durations of time including sync,tick,promise,timeout */
export const DURATION = {
  // @ts-ignore
  Sync: (v?: unknown) => v,
  Promise: (v?: unknown) => Promise.resolve(v),
  Timeout: (v?: unknown) =>
    new Promise((resolve) => setTimeout(() => resolve(v), 0)),
};

/** AWAITABLE.Blink */
export const AWAITABLE = {
  Duration: (n: number, v?: unknown) => of(v).pipe(delay(n)),
  ...Object.keys(THRESHOLD).reduce((all, name) => {
    // @ts-ignore
    all[name] = () => AWAITABLE.Duration(THRESHOLD[name], 'name');
    return all;
  }, {} as { [key: string]: () => Observable<unknown> }),
};
