import { Observable, PartialObserver, Subject, Subscription } from 'rxjs';
import { filter, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { Thunk } from './utils';
export type Predicate<T> = (item: T) => boolean;
export type ResultCreator<T, TConsequence> = (
  item: T
) => Observable<TConsequence>;

export type TapObserver<T> =
  | PartialObserver<T>
  | {
    subscribe: () => void;
  };

export interface TriggeringObserver<TConsequence, TBusItem> {
  next?: (consequence: TConsequence) => TBusItem
  [key: string]: ((consequence: TConsequence) => TBusItem) | undefined
}

interface EventBus<TBusItem> {
  query(matcher: Predicate<TBusItem>): Observable<TBusItem>;
  trigger(item: TBusItem): void;
  listen<TConsequence extends TBusItem>(
    matcher: Predicate<TBusItem>,
    handler: ResultCreator<TBusItem, TConsequence>,
    observer?: TapObserver<TConsequence>
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
export class Omnibus<TBusItem> implements EventBus<TBusItem> {
  private channel: Subject<TBusItem>;
  private resets: Subject<void>;

  constructor() {
    this.resets = new Subject();
    this.channel = new Subject();
  }

  /**
   *
   * @param matcher A predicate to filter only events for which it returns true
   * @returns
   */
  public query(matcher: Predicate<TBusItem>) {
    return this.channel
      .asObservable()
      .pipe(filter(matcher), takeUntil(this.resets));
  }

  /**
   *
   * @param item The Event or other object to place onto the event bus, once it passes all filters.
   */
  public trigger(item: TBusItem) {
    this.channel.next(item);
  }

  /**
   * Triggers an item created by applying a mapping function to an item,
   * as is needed when creating Actions out of payloads.
   * @param item the payload
   * @param mapper the function, usually an actionCreator
   * @returns
   */
  public triggerMap<X>(item: X, mapper: (i: X) => TBusItem) {
    this.channel.next(mapper(item));
  }

  /**
   *
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Creates an Observable of work. Called for each matching event. ConcurrencyMode is applied to it.
   * @returns a subscription that can be used to unsubscribe the listener, thereby canceling work in progress.
   */
  public listen<SubType extends TBusItem, TConsequence>(
    matcher: Predicate<SubType>,
    handler: ResultCreator<SubType, TConsequence>,
    observer?: TapObserver<TConsequence>,
    observerTypes?: TriggeringObserver<TConsequence, TBusItem>
  ) {
    // LEFTOFF 2 create Observer<TConsequence> from Record<Keys<TapObserver>,Thunk<TBusItem>>
    // LEFTOFF 2.1 widen observer to TapObserver subscribe, unsubscribe, finalize
    // LEFTOFF 3 Concurrency ops passable in
    // LEFTOFF 4 handler returns ObservableInput not only Observable
    // LEFTOFF 0.9 mocks can create any observable (NTCE grammar)
    // LEFTOFF 5 filters

    // @ts-ignore
    const _observer = observer ? observer : observerTypes ? Object.keys(observerTypes).reduce((all, key) => {
      // @ts-ignore
      const itemCreator = observerTypes[key] as (c: TConsequence) => TBusItem
      // @ts-ignore
      all[key] = (c: TConsequence) => { this.triggerMap(c, itemCreator) }
      return all
    }, {} as TapObserver<TConsequence>) : undefined

    // @ts-ignore dynamic
    const consequences = this.query(matcher).pipe(
      // @ts-ignore dynamic
      mergeMap((i) => handler(i).pipe(tap(_observer)))
    );

    return consequences.subscribe();
  }

  public reset(): void {
    this.resets.next();
  }
}
