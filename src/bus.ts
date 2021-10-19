//#region imports
import {
  Observable,
  ObservableInput,
  Observer,
  OperatorFunction,
  PartialObserver,
  Subject,
  Subscription,
} from 'rxjs';
import { defer, EMPTY, from } from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  mergeMap,
  switchMap,
} from 'rxjs/operators';
import { filter, takeUntil, tap } from 'rxjs/operators';
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

const thunkTrue = () => true;
//#endregion

/**
 * An instance of an Omnibus provides type-safe ways of triggering
 * and canceling side-effects, in response to events triggered upon it.
 *
 * In addition, an Omnibus instance allows delcarative concurrency
 * control, and provides ample means to dispose of resources at the
 * callers' control. When the side-effects are implemented as Observables,
 * cancelation and declarative concurrency control can be applied,
 * harnessing the power of RxJS operators.
 */
export class Omnibus<TBusItem> {
  private channel: Subject<TBusItem>;
  private resets: Subject<void>;
  private guards: Array<[Predicate<TBusItem>, (item: TBusItem) => void]>;
  private filters: Array<[Predicate<TBusItem>, (item: TBusItem) => TBusItem]>;
  private spies: Array<[Predicate<TBusItem>, (item: TBusItem) => void]>;

  /** While unhandled listener errors terminate the listener,
   * the cause of that error is available on channel.errors
   */
  public errors: Subject<string | Error>;

  constructor() {
    this.resets = new Subject();
    this.channel = new Subject();
    this.errors = new Subject();
    this.guards = new Array();
    this.filters = new Array();
    this.spies = new Array();
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
    this.guards.forEach(([predicate, guard]) => {
      predicate(item) && guard(item);
    });

    let filteredItem = item;
    this.filters.forEach(([predicate, filter]) => {
      /* istanbul ignore next */ // just doesnt get picked up
      if (!predicate(item)) return;

      const filterResult = filter(filteredItem);
      /* istanbul ignore next */ // just doesnt get picked up
      if (filterResult !== null && filterResult !== undefined) {
        filteredItem = filterResult;
      }
    });

    this.spies.forEach(([predicate, handler]) => {
      predicate(filteredItem) && handler(filteredItem);
    });
    this.channel.next(filteredItem);
  }

  /** Attach side-effect executors to the bus via `listen`.
   *
   * @param matcher A predicate (returning Boolean) function to determine the subset of Event Bus events the handler will be invoked for.
   * @param handler Creates an Observable of work. Called for each matching event. ConcurrencyMode is applied to it.
   * @param observer Does something with the .
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

        // @ts-ignore
        const errorCallback = observer?.error;
        const errLessObserver = { ...observer, error: undefined };
        const pipes: OperatorFunction<TConsequence, unknown>[] = [
          tap(errLessObserver),
        ];
        if (errorCallback) {
          pipes.push(
            catchError((e) => {
              errorCallback(e);
              return EMPTY;
            })
          );
        }
        // @ts-ignore
        return obsResult.pipe(...pipes);
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

  /** Run a function (synchronously) for all runtime events, prior to all spies and listeners.
   * Throwing an exception will raise to the triggerer, but not terminate the guard.*/
  public guard(matcher: Predicate<TBusItem>, fn: (item: TBusItem) => void) {
    this.guards.push([matcher, fn]);
    return this.createRemovalSub(matcher, fn, this.guards);
  }

  /** Run a function (synchronously) for all runtime events, prior to all spies and listeners.
   * Throwing an exception will raise to the triggerer, but not terminate the guard.*/
  public filter(
    matcher: Predicate<TBusItem>,
    fn: (item: TBusItem) => TBusItem
  ) {
    this.filters.push([matcher, fn]);
    return this.createRemovalSub(matcher, fn, this.filters);
  }

  /** Run a function (synchronously) for all runtime events, prior to all listeners. Throwing an exception will terminate the spy.*/
  public spy(fn: (item: TBusItem) => void) {
    this.spies.push([thunkTrue, fn]);
    return this.createRemovalSub(thunkTrue, fn, this.spies);
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

  private createRemovalSub(
    matcher: Function,
    fn: Function,
    all: Array<[Predicate<TBusItem>, (item: TBusItem) => unknown]>
  ) {
    return new Subscription(() => {
      const whereamI = all.findIndex((pp) => pp[0] === matcher && pp[1] === fn);
      all.splice(whereamI, 1);
    });
  }
}
