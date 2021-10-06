//#region imports
// prettier-ignore-start
import {
  Observable,
  ObservableInput,
  Observer,
  PartialObserver,
  Subject,
  Subscription,
} from 'rxjs';
import { defer, EMPTY, from } from 'rxjs';
import { concatMap, exhaustMap, mergeMap, switchMap } from 'rxjs/operators';
import { filter, takeUntil, tap } from 'rxjs/operators';
// prettier-ignore-end
//#endregion

//#region types
export type Predicate<T> = (item: T) => boolean;
export type ListenerReturnValue<T, TConsequence> =
  | ((o: Observer<T>) => void)
  | (() => ObservableInput<TConsequence>)
  | ObservableInput<TConsequence>
  | void;
export type ResultCreator<T, TConsequence> = (
  item: T
) => ListenerReturnValue<T, TConsequence>;

type SubscribeObserver = {
  subscribe: () => void;
  unsubscribe: () => void;
};
export type TapObserver<T> = PartialObserver<T> | SubscribeObserver;
export type ObserverKey = keyof PartialObserver<any> | keyof SubscribeObserver;
export type MapFn<T, U> = (t?: T) => U;
export type Mapper<T, U> = Record<ObserverKey, MapFn<T, U>>;

/** A map of action creators getObserverFromActionMap  */
export interface TriggeredItemMap<TConsequence, TBusItem> {
  next?: (c: TConsequence) => TBusItem;
  error?: (e: any) => TBusItem;
  complete?: (i: any) => TBusItem;
  subscribe?: (i: any) => TBusItem;
  unsubscribe?: (i: any) => TBusItem;
}

const thunkTrue = () => true;

//#endregion

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
export class Omnibus<TBusItem> {
  private channel: Subject<TBusItem>;
  private resets: Subject<void>;
  private preprocessors: Array<[Predicate<TBusItem>, (item: TBusItem) => void]>;

  /** While unhandled listener errors terminate the listener,
   * the cause of that error is available on channel.errors
   */
  public errors: Subject<string | Error>;

  constructor() {
    this.resets = new Subject();
    this.channel = new Subject();
    this.errors = new Subject();
    this.preprocessors = new Array();
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
    this.preprocessors.forEach(([predicate, handler]) => {
      predicate(item) && handler(item);
    });
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
  public listen<TConsequence>(
    matcher: Predicate<TBusItem>,
    handler: ResultCreator<TBusItem, TConsequence>,
    observer?: TapObserver<TConsequence>,
    operator = mergeMap
  ) {
    // @ts-ignore dynamic
    const consequences = this.query(matcher).pipe(
      operator((event) => {
        const obsResult = this.getHandlingResult(handler, event);
        return obsResult.pipe(tap(observer));
      })
    );
    const errorNotifier: PartialObserver<unknown> = {
      error: (e: Error) => {
        this.errors.next(e);
      },
    };
    return consequences.subscribe(errorNotifier);
  }

  /** Calls listen with concatMap (queueing) semantics */
  public listenQueueing<TConsequence>(
    matcher: Predicate<TBusItem>,
    handler: ResultCreator<TBusItem, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    return this.listen(matcher, handler, observer, concatMap);
  }

  /** Calls listen with switchMap (restarting) semantics */
  public listenSwitching<TConsequence>(
    matcher: Predicate<TBusItem>,
    handler: ResultCreator<TBusItem, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    return this.listen(matcher, handler, observer, switchMap);
  }

  /** Calls listen with blocking (exhausting) semantics */
  public listenBlocking<TConsequence>(
    matcher: Predicate<TBusItem>,
    handler: ResultCreator<TBusItem, TConsequence>,
    observer?: TapObserver<TConsequence>
  ) {
    return this.listen(matcher, handler, observer, exhaustMap);
  }

  /** Run a function (synchronously) for all runtime events, prior to all listeners. Throwing an exception will terminate the spy.*/
  public spy(fn: (item: TBusItem) => void) {
    this.preprocessors.push([thunkTrue, fn]);
    return this.createRemovalSub(thunkTrue, fn);
  }

  /** Run a function (synchronously) for all runtime events, prior to all spies and listeners.
   * Throwing an exception will raise to the triggerer, but not terminate the guard.*/
  public guard(matcher: Predicate<TBusItem>, fn: (item: TBusItem) => void) {
    const preprocs = this.preprocessors;
    const firstSpyIdx = preprocs.findIndex((pp) => pp[0] === thunkTrue);
    /* istanbul ignore next */ // jest misreports the following line as uncovered
    const beforeSpies = firstSpyIdx > -1 ? firstSpyIdx : preprocs.length;
    preprocs.splice(beforeSpies, 0, [matcher, fn]);
    return this.createRemovalSub(matcher, fn);
  }

  /** Takes an observer-shaped object of action creators, turns it into
   * an Observer of callbacks which trigger onto this bus.
   */
  public getObserverFromActionMap<TConsequence, TBusItem>(
    observerTypes: TriggeredItemMap<TConsequence, TBusItem>
  ) {
    return Object.keys(observerTypes).reduce((all, key) => {
      // @ts-ignore
      const itemCreator = observerTypes[key]; // as (c: TConsequence) => TBusItem
      // @ts-ignore
      all[key] = (c) => {
        this.triggerMap(c, itemCreator);
      };
      return all;
    }, {} as TapObserver<TConsequence>);
  }

  public reset(): void {
    this.resets.next();
  }

  /** Creates an EffectObserver that triggers an event on the bus, for each of the effects' `next` notifications.
   */
  public observeAll<
    TConsequence extends TBusItem
  >(): TapObserver<TConsequence> {
    return {
      next: (c: TConsequence) => {
        this.trigger(c);
      },
    };
  }

  /** Creates an EffectObserver that triggers events to the bus for each notification
   * of the effect (next, error, complete), but also for (subscribe and unsubscribe).
   * Accepts a map with of mapping functions, like FSA action creators. The corresponding
   * notifications will be triggered to the bus as returned by these mapping functions. **/
  public observeWith<TConsequence>(mapper: Mapper<TConsequence, TBusItem>) {
    // invariant - at least one key
    // @ts-ignore
    const observer: PartialObserver<TConsequence> & SubscribeObserver = {};
    ['next', 'error'].forEach((key) => {
      // @ts-ignore
      if (mapper[key]) {
        // prettier-ignore
        // @ts-ignore
        observer[key] = (valueOrError) => this.trigger(mapper[key](valueOrError));
      }
    });

    ['complete', 'subscribe', 'unsubscribe'].forEach((key) => {
      // @ts-ignore
      if (mapper[key]) {
        // @ts-ignore
        observer[key] = () => this.trigger(mapper[key]());
      }
    });
    return observer;
  }

  private getHandlingResult<SubType extends TBusItem, TConsequence>(
    handler: ResultCreator<SubType, TConsequence>,
    event: TBusItem
  ) {
    // @ts-ignore dynamic
    const oneResult = handler(event);
    const obsResult: Observable<TConsequence> =
      typeof oneResult === 'function'
        ? // @ts-ignore
          oneResult.length === 0
          ? // @ts-ignore
            defer(oneResult)
          : // @ts-ignore
            new Observable(oneResult)
        : // @ts-ignore
          from(oneResult ?? EMPTY);
    return obsResult;
  }

  private createRemovalSub(matcher: Function, fn: Function) {
    return new Subscription(() => {
      const whereamI = this.preprocessors.findIndex(
        (pp) => pp[0] === matcher && pp[1] === fn
      );
      this.preprocessors.splice(whereamI, 1);
    });
  }
}
