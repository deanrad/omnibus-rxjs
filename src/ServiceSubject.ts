import { Omnibus } from '../src/bus';
import { createService, Service, ActionCreators } from '../src/createService';
import { Observable, SubscriptionLike } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { Action, ActionCreator } from 'typescript-fsa';

export class ServiceSubject<TRequest, TNext, TState>
  implements SubscriptionLike
{
  private service: Service<TRequest, TNext, Error, TState>;
  public bus: Omnibus<Action<any>>;
  public actions: ActionCreators<TRequest, TNext, Error>;
  public state: Observable<TState>;
  public isActive: Observable<boolean>;
  public closed: boolean;

  constructor(
    namespace: string,
    handler: (e: TRequest) => any,
    reducerFactory: (
      acs?: ActionCreators<TRequest, TNext, Error>
    ) => (state: TState, action: Action<any>) => TState
  ) {
    this.bus = new Omnibus();
    this.service = createService<TRequest, TNext, Error, TState>(
      namespace,
      this.bus,
      handler,
      reducerFactory
    );
    this.actions = this.service.actions;
    this.state = this.service.state.pipe(distinctUntilChanged());
    this.isActive = this.service.isActive;
    this.closed = false;
  }

  public query(predicate: Parameters<Omnibus<Action<any>>['query']>[0]) {
    return this.bus.query(predicate);
  }

  /** Kills all running effects, removes guards/listeners, and releases resources. Future calls to next() will error. */
  public unsubscribe() {
    this.service.stop();
    this.closed = true;
  }

  /** Kills all running effects, removes guards/listeners, and releases resources. Future calls to next() will error. */
  public stop() {
    this.service.stop();
    this.closed = true;
  }
  /** Kills all running effects and removes guards/listeners, but leaves the service ready for more requests. */
  public reset() {
    this.bus.reset();
  }

  /** Gives the service an event, asking it to run any listeners that
   * match that event.
   */
  public next(request: TRequest) {
    this.service(request);
  }

  /** Add a listener in order to run effects on matching events.
   * Pass a concurrency operator (eg switchMap) as the last argument.
   * to
   */
  public listen(
    matcher: Parameters<Omnibus<Action<any>>['listen']>[0] | ActionCreator<any>,
    handler: Parameters<Omnibus<Action<any>>['listen']>[1],
    observer: Parameters<Omnibus<Action<any>>['listen']>[2],
    operator: Parameters<Omnibus<Action<any>>['listen']>[3]
  ) {
    return this.bus.listen(
      this.toPredicate(matcher),
      handler,
      observer,
      operator
    );
  }

  public guard(
    matcher: Parameters<Omnibus<Action<any>>['guard']>[0] | ActionCreator<any>,
    ...args: [any]
  ) {
    return this.bus.guard(this.toPredicate(matcher), ...args);
  }

  public cancelCurrent() {
    this.service.cancelCurrent();
  }

  public cancelCurrentAndQueued() {
    this.service.cancelCurrentAndQueued();
  }

  private toPredicate(
    matcher: Parameters<Omnibus<Action<any>>['listen']>[0] | ActionCreator<any>
  ) {
    return (
      (matcher as ActionCreator<TRequest>).match
        ? (matcher as ActionCreator<TRequest>).match
        : matcher
    ) as (i: Action<any>) => i is Action<any>;
  }
}
