import { firstValueFrom, Observable, of, timer, concat, from, defer, merge, isObservable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> { }

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
export function after<T>(ms: number | Promise<any>, objOrFn?: T | (() => T)) {
  const resultFn = (typeof (objOrFn) === "function" ? objOrFn : () => objOrFn) as () => T

  let obs: Observable<T>
  if (ms === 0) obs = of(resultFn())

  if (typeof ms === "number") {
    obs = new Observable((notify) => {
      const id = setTimeout(() => {
        const retVal = resultFn();
        notify.next(retVal)
        notify.complete()
      }, ms)
      return () => { id && clearTimeout(id) }
    })
  } else if (isObservable(objOrFn)) {
  } else {
    const seqPromise = (ms as Promise<T>).then(resultFn)
    obs = from(seqPromise)
  }
  Object.assign(obs, {
    then(resolve: (v: T) => any, reject: (e: unknown) => unknown) {
      return (firstValueFrom(obs) as PromiseLike<T>).then(resolve, reject);
    },
  });

  return obs as Observable<T> & PromiseLike<T>;
}

// #endregion
