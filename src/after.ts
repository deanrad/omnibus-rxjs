import { firstValueFrom, Observable, of, timer, concat, from, defer, merge, isObservable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface AwaitableObservable<T> extends PromiseLike<T>, Observable<T> { }

export interface Thunk<T> {
  (): T;
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
export function after<T>(ms: number | Promise<any>, valueProvider?: T | (() => T) | Observable<T>) {
  const resultFn = (typeof (valueProvider) === "function" ? valueProvider : () => valueProvider) as () => T

  let obs: Observable<T>
  if (ms === 0) obs = of(resultFn())

  if (typeof ms === "number") {
    if ((valueProvider as Observable<T>)?.subscribe) {
      const delay = timer(ms as unknown as number)
      obs = delay.pipe(
        mergeMap(() => (valueProvider as Observable<T>))
      )
    } else {
      obs = new Observable((notify) => {
        const id = setTimeout(() => {
          const retVal = resultFn();
          notify.next(retVal)
          notify.complete()
        }, ms)
        return () => { id && clearTimeout(id) }
      })
    }
  } else { // a Promise - doesnt work with an Observable
    obs = new Observable(notify => {
      let canceled = false
      const conditionalSeq = (ms as Promise<T>).then(() => {
        if (!canceled) {
          const result = resultFn()
          notify.next(result)
          notify.complete()
        }
      }
      )
      return () => { canceled = true }
    })
  }
  Object.assign(obs, {
    then(resolve: (v: T) => any, reject: (e: unknown) => unknown) {
      return (firstValueFrom(obs) as PromiseLike<T>).then(resolve, reject);
    },
  });

  return obs as Observable<T> & PromiseLike<T>;
}

// #endregion
