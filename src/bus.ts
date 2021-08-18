import { Observable, PartialObserver, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export type Predicate<T> = (item: T) => boolean;
export type ResultCreator<T, U> = (item: T) => Observable<U>;

export type TapObserver<T> =
  | PartialObserver<T>
  | {
      start: (item: T) => void;
    };

interface EventBus<T> {
  query(matcher: Predicate<T>): Observable<T>;
  trigger(item: T): void;
  listen<U>(
    matcher: Predicate<T>,
    handler: ResultCreator<T, U>,
    observer?: TapObserver<U>
  ): Subscription;
}
/**
 * An instance of an Omnibus implements the EventBus interface,
 * providing type-safe ways of triggering, filtering, and running
 * side-effects in response to listening to events.
 *
 * In addition, an Omnibus instance allows delcarative concurrency
 * control, and provides ample means to dispose of resources at the
 * callers' control. When the side-effects are implemented as Observables,
 * cancelation and declarative concurrency control can be applied, like
 * RxJS operators.
 * 
 * Errors are isolated, and mappable to further-triggered events, via
 * an Observer that can attach callbacks to the lifecycle events of 
 * Observables.
 * @see EventBus
 */
export class Omnibus<T> implements EventBus<T>{
  private channel: Subject<T>;

  constructor() {
    this.channel = new Subject();
  }

  /**
   *
   * @param matcher A predicate to filter only events for which it returns true
   * @returns
   */
  public query(matcher: Predicate<T>) {
    return this.channel.asObservable().pipe(filter(matcher));
  }

  /**
   *
   * @param item The Event or other object to place onto the event bus, once it passes all filters.
   */
  public trigger(item: T) {
    this.channel.next(item);
  }

  /**
   * Triggers an item created by applying a mapping function to an item,
   * as is needed when creating Actions out of payloads.
   * @param item the payload
   * @param mapper the function, usually an actionCreator
   * @returns
   */
  public triggerMap<X>(item: X, mapper: (i: X) => T) {
    this.channel.next(mapper(item));
  }

  /**
   *
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Creates an Observable of work. Called for each matching event. ConcurrencyMode is applied to it.
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listen<SubType extends T, U>(
    matcher: Predicate<SubType>,
    handler: ResultCreator<SubType, U>,
    observer?: TapObserver<U>
  ) {
    //
    // return it
    return new Subscription();
  }

}
