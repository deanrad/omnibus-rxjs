import { Omnibus } from './bus';
import {
  Subscription,
  Observable,
  from,
  EMPTY,
  BehaviorSubject,
  firstValueFrom,
} from 'rxjs';

import {
  scan,
  map,
  distinctUntilChanged,
  endWith,
  takeUntil,
  mergeMap,
  concatMap,
  switchMap,
  exhaustMap,
} from 'rxjs/operators';
import { Action, ActionCreator, actionCreatorFactory } from 'typescript-fsa';
import { toggleMap } from './toggleMap';
import type { ResultCreator } from './bus';

/** A standardized convention of actions this service listens to, and responsds with. */
export interface ActionCreators<TRequest, TNext, TError> {
  /** invokes the service */
  request: ActionCreator<TRequest>;
  /** cancels the current invocation of the service */
  cancel: ActionCreator<void>;
  started: ActionCreator<void>;
  next: ActionCreator<TNext>;
  error: ActionCreator<TError>;
  complete: ActionCreator<void>;
  canceled: ActionCreator<void>;
}

/** Helpful, optional interface to differentiate service actions. */
export interface HasSubtype<T = string> {
  subtype: T;
}

interface Stoppable {
  /** Terminates the listener, any of its Observable handlings.
   * @returns The closed subscription.
   */
  stop(): Subscription;
  /** Cancels the current handling by triggering service.actions.cancel.
   * The effect is truly canceled if it was started from an Observable.
   * The canceled event will appear on the bus, and no more next events.
   */
  cancelCurrent(): void;
  /** Cancels the current handling by triggering service.actions.cancel.
   * In addition, any operations enqueued will not be begun. (Safe to call even if not a queueing service.)
   */
  cancelCurrentAndQueued(): void;
  /**
   * Adds a function to be called only once when stop() is invoked
   */
  addTeardown(teardownFn: Subscription['add']): void;
}

interface Queryable<TReq, TRes> {
  send(arg: TReq): Promise<TRes>;
}

/**
 * A service is a listener over a bus, which triggers responses in some combination to
 * the requests it recieves. On each request it runs a handler
 *  (subject to its concurrency strategy) then triggers events based on that handler's lifecycle.
 *  For a service defined with the prefix "time", its event schema would be:
 *
 * - `time/request` - client: requests the time
 * - `time/cancel` - client: cancel the current request for the time
 * - `time/started` - server: time resolution has begun
 * - `time/next` - server: contains the time as a payload
 * - `time/complete` - server: no more times will be sent
 * - `time/error` - server: an error occurred (the listener remains alive due to internal rescueing)
 * - `time/canceled` - server: has canceled the current request for the time
 */
export interface Service<TRequest, TNext, TError, TState>
  extends Stoppable,
    Queryable<TRequest, Action<TNext>> {
  /** Invoke the service as a function directly (RTK style). */
  (req: TRequest): void;
  /** Explicitly pass a request object */
  request(req: TRequest): void;
  /** The ActionCreator factories this service listens for, and responds with. */
  actions: ActionCreators<TRequest, TNext, TError>;
  /** An Observable of just the events of this service on the bus */
  events: Observable<Action<void | TRequest | TNext | TError>>;
  /** Indicates whether a handling is in progress. Use `.value`, or `subscribe()` for updates.  */
  isActive: BehaviorSubject<boolean>;
  /** Uses the reducer to aggregate the events that are produced from its handlers, emitting a new state for each action (de-duping is not done). Use `.value`, or `subscribe()` for updates. */
  state: BehaviorSubject<TState>;
  /** An untyped reference to the bus this service listens and triggers on */
  bus: Omnibus<any>;
  /** The namespace given at construction time */
  namespace: string;
}

/** @example bus.listen(matchesAny(Actions.complete, Actions.error), handler) */
export function matchesAny(...acs: ActionCreator<any>[]) {
  return (e: any) => {
    return !!acs.find((ac) => ac.match(e));
  };
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. By default
 * runs handlers simultaneously.
 *
 * @param actionNamespace - Prefix of all actions: The 'search' in search/request
 * @param bus - The Omnibus event bus triggered to and listened on
 * @param handler - A function returning a Promise, Observable, or Promise thunk from whose life-cycle events are triggered.
 * @param reducerProducer - A function returning a reducer which populates `.state`. Recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns
 */
export function createService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError | void>>,
  handler: ResultCreator<TRequest, TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    },
  listenMode:
    | typeof mergeMap
    | 'listen'
    | 'listenQueueing'
    | 'listenBlocking'
    | 'listenSwitching' = 'listen'
): Service<TRequest, TNext, TError, TState> {
  const namespacedAction = actionCreatorFactory(actionNamespace);

  const ACs: ActionCreators<TRequest, TNext, TError> = {
    request: namespacedAction<TRequest>('request'),
    cancel: namespacedAction<void>('cancel'),
    started: namespacedAction<void>('started'),
    next: namespacedAction<TNext>('next'),
    error: namespacedAction<TError>('error'),
    complete: namespacedAction<void>('complete'),
    canceled: namespacedAction<void>('canceled'),
  };

  const isActive = new BehaviorSubject(false);
  const isActiveSub = bus
    .query(matchesAny(ACs.started, ACs.error, ACs.complete, ACs.canceled))
    .pipe(
      scan((all, e) => all + (ACs.started.match(e) ? 1 : -1), 0),
      map(Boolean),
      distinctUntilChanged(),
      endWith(false)
    )
    .subscribe(isActive);

  const reducer = reducerProducer(ACs);
  const state = new BehaviorSubject<TState>(
    // @ts-ignore // RTK reducers use this style
    reducer.getInitialState ? reducer.getInitialState() : reducer()
  );
  const stateSub = bus
    .query(matchesAny(...Object.values(ACs)))
    .pipe(
      scan((all, e) => reducer(all, e), state.value),
      distinctUntilChanged()
    )
    .subscribe(state);

  let cancelCounter = new BehaviorSubject<number>(0);

  // The base return value
  const requestor = (req: TRequest) => {
    const action = ACs.request(req);
    action.meta = { cancelIdxAtCreation: cancelCounter.value };
    bus.trigger(action);
  };

  const wrappedHandler = (e: Action<TRequest | TNext | TError>) => {
    const oneResult = handler(e.payload as TRequest);
    /* istanbul ignore next */
    const obsResult: Observable<TNext> =
      typeof oneResult === 'function'
        ? new Observable(oneResult)
        : from(oneResult ?? EMPTY);

    const { cancelIdxAtCreation } = e.meta || {};
    delete e.meta;

    return new Observable((observer) => {
      // cancelCurrentAndQueued has been called so exit immediately, complete()-ing so others can queue later.
      if (cancelCounter.value > cancelIdxAtCreation) {
        observer.complete();
        return;
      }

      const sub = obsResult
        .pipe(takeUntil(bus.query(ACs.cancel.match)))
        .subscribe(observer);

      return () => sub.unsubscribe();
    }) as Observable<TNext>;
  };

  // Determine the operator to combine handlings with
  let listenOp;
  // prettier-ignore
  if (typeof listenMode === 'string') {
    switch (listenMode) {
      case 'listen': listenOp = mergeMap; break;
      case 'listenQueueing': listenOp = concatMap; break;
      case 'listenSwitching': listenOp = switchMap; break;
      case 'listenBlocking': listenOp = exhaustMap; break;
    }
  } else {
    listenOp = listenMode;
  }
  /** The main subscription of this service */
  const sub = bus.listen(
    ACs.request.match,
    wrappedHandler,
    bus.observeWith({
      // @ts-ignore
      next: ACs.next,
      // @ts-ignore
      error: ACs.error,
      // @ts-ignore
      complete: ACs.complete,
      // @ts-ignore
      subscribe: ACs.started,
      // @ts-ignore
      unsubscribe: ACs.canceled,
    }),
    listenOp
  );

  // Enhance and return
  const controls: Stoppable = {
    stop() {
      sub.unsubscribe();
      isActiveSub.unsubscribe(); // flow no more values to it
      isActive.complete(); // make isStopped = true
      stateSub.unsubscribe(); // flow no more values to it
      state.complete(); // make isStopped = true
      return sub;
    },
    addTeardown(teardownFn: Subscription['add']) {
      sub.add(teardownFn);
    },
    cancelCurrent() {
      bus.trigger(ACs.cancel());
    },
    cancelCurrentAndQueued() {
      cancelCounter.next(cancelCounter.value + 1);
      bus.trigger(ACs.cancel());
    },
  };
  const returnValue = Object.assign(requestor, { actions: ACs }, controls, {
    isActive,
    state,
    bus,
    namespace: actionNamespace,
    request: requestor,
    events: bus.query(matchesAny(...Object.values(ACs))),
    send(arg: TRequest) {
      const result = firstValueFrom(bus.query(ACs.next.match)) as Promise<
        Action<TNext>
      >;
      bus.trigger(ACs.request(arg));
      return result;
    },
  });

  return returnValue;
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. Queues up handlers if
 * they return deferred objects: () => Promise or Observable.
 *
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns
 */
export function createQueueingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError | void>>,
  handler: ResultCreator<TRequest, TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    'listenQueueing'
  );
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. Prevents events from a previous handling
 * from being emitted, and cancels the handler if it returned an Observable.
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns
 */
export function createSwitchingService<
  TRequest,
  TNext,
  TError,
  TState = object
>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError | void>>,
  handler: ResultCreator<TRequest, TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    'listenSwitching'
  );
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. Prevents a new handler from starting
 * if one is in progress - handy for having a singleton handler
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns
 */
export function createBlockingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError | void>>,
  handler: ResultCreator<TRequest, TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    'listenBlocking'
  );
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. If a handler is running, terminates it, and does not begin a new handling.
 *
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns
 */
export function createTogglingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError | void>>,
  handler: ResultCreator<TRequest, TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _: any) => {
      return state;
    }
): Service<TRequest, TNext, TError, TState> {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    // @ts-ignore
    toggleMap
  );
}
