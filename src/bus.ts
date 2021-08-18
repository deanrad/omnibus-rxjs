import { Observable, PartialObserver, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
export type Predicate<T> = (item: T) => boolean;
export type ResultCreator<T, U> = (item: T) => Observable<U>;

type TapObserver<T> = PartialObserver<T> | {
  start: (item:T) => void;
}
export class Omnibus<T> {
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
  public triggerMap<X>(item: X, mapper: (i:X)=>T) {
    this.channel.next(mapper(item))
  }

  /**
   *
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Creates an Observable of work. Called for each matching event. ConcurrencyMode is applied to it.
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listen<T, U>(
    matcher: Predicate<T>,
    handler: ResultCreator<T, U>,
    observer?: TapObserver<U>
  ) {
    //
    // return it
    return new Subscription();
  }
}
