// @ts-nocheck
import { Observable, Subscription } from 'rxjs';

export interface Spawner {
  (event: any): Observable<any>;
}

/**
 * Subscribes to each Observable mapped from each source value, maintaining only one active subscription at a time.
 * New triggerings only begin subscriptions if the previous subscription is not running.
 * This effectively "gates" a single subscription, and so can represent a toggle, like a light switch.
 * @param spawner The Observable-factory whose subscription is to be toggled
 * @param mapper A function to combine each emission of the togglable with the trigger itself, making it the new value of the togglable.
 * @example ```
 * const switch = new Subject();
 * const light = switch.pipe(toggleMap(() => turnLightOn$)).subscribe()
 * function connectWires(status){ console.log('connected: ' + status); }
 *
 * const turnLightOn$ = new Observable(() => {
 *   connectWires(true); // never complete the observable
 *   return () => connectWires(false)
 * );
 *
 * switch.next(); switch.next();
 * ```
 */
export const toggleMap = (
  spawner: Spawner,
  mapper = (_: any, inner: any) => inner
) => {
  return function (source: Observable<any>) {
    return new Observable((notify) => {
      let innerSub: Subscription;
      return source.subscribe({
        next(trigger) {
          if (!innerSub || innerSub.closed) {
            innerSub = spawner(trigger).subscribe({
              next: (inner) => notify.next(mapper(trigger, inner)),
              error: (e) => notify.error(e),
            });
          } else {
            innerSub.unsubscribe();
          }
        },
        error(e) {
          notify.error(e);
        },
        complete() {
          notify.complete();
        },
      });
    });
  };
};
