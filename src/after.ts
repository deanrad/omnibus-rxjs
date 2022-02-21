import { firstValueFrom, Observable, of, timer, concat, from, defer, merge, isObservable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> { }

export interface Thunk<T> {
  (): T;
}

function makeThenable<T>(obs: Observable<T>) {
  Object.assign(obs, {
    then(resolve: (v: T) => any, reject: (e: unknown) => unknown) {
      return (firstValueFrom(obs) as PromiseLike<T>).then(resolve, reject);
    },
  });
  return obs as Observable<T> & PromiseLike<T>;
}
/**
 * `after` is a better setTimeout, implemented as an Observable. 
 * `after` is both lazy, cancelable, and 'thenable'— it can be awaited like a Promise.
* `after` returns an Observable of the value, or result of the function call, or the Observable, after the given delay.
 *  For a delay of 0, the function is executed synchronously when `.subscribe()` is called.
 * 
 * @returns An delayed Observable of the object, thunk return value, or Observable's notification(s).
 * @argument ms Either a number of milliseconds, or a Promise. 
 * @argument valueProvider Can be a value, a function returning a value, or an Observable.
 */
export function after<T>(ms: number | Promise<any>, valueProvider?: T | ((v?: T) => T) | Observable<T>) {
  const resultFn = (typeof (valueProvider) === "function" ? valueProvider : () => valueProvider) as (v?: T) => T

  // case: synchronous
  if (ms === 0) {
    return makeThenable(of(resultFn()))
  }

  // case: 1st argument Promise. Errors if last argument is an Observable.
  if (typeof ms === "object" && (ms as PromiseLike<T>).then) {
    const obs = new Observable(notify => {
      let canceled = false
      const conditionalSeq = (ms as Promise<T>).then((resolved) => {
        if (!canceled) {
          const result = resultFn(resolved)
          notify.next(result)
          notify.complete()
        }
      }
      )
      return () => { canceled = true }
    })
    return makeThenable(obs)
  }

  // Case: 2nd argument Observable. Errors unless first arg is a number.
  if ((valueProvider as Observable<T>)?.subscribe) {
    const delay: Observable<number> = timer(ms as unknown as number)
    return makeThenable(delay.pipe(
      mergeMap(() => (valueProvider as Observable<T>))
    ))
  }

  // Default - a value or thunk and a number of milliseconds
  const obs = new Observable((notify) => {
    const id = setTimeout(() => {
      const retVal = resultFn();
      notify.next(retVal)
      notify.complete()
    }, ms as number)
    return () => { id && clearTimeout(id) }
  })

  return makeThenable(obs)
}

// #endregion
