import { Omnibus } from '../src/bus';
import { createService, Service, ActionCreators } from '../src/createService';
import { Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { Action, ActionCreator } from 'typescript-fsa';

export class ServiceSubject<TRequest, TNext, TError, TState> {
  private service: Service<TRequest, TNext, TError, TState>;
  public bus: Omnibus<Action<any>>;
  public actions: ActionCreators<TRequest, TNext, TError>;
  public state: Observable<TState>;
  public isActive: Observable<boolean>;

  constructor(
    namespace: string,
    handler: (e: TRequest) => any,
    reducerFactory: (
      acs?: ActionCreators<TRequest, TNext, TError>
    ) => (state: TState, action: Action<any>) => TState
  ) {
    this.bus = new Omnibus();
    this.service = createService<TRequest, TNext, TError, TState>(
      namespace,
      this.bus,
      handler,
      reducerFactory
    );
    this.actions = this.service.actions;
    this.state = this.service.state.pipe(distinctUntilChanged());
    this.isActive = this.service.isActive;
  }

  public next(request: TRequest) {
    this.service(request);
  }
  public listen(
    matcher: Parameters<Omnibus<Action<any>>['listen']>[0] | ActionCreator<any>,
    ...args: [any, any?, any?]
  ) {
    return this.bus.listen(this.toPredicate(matcher), ...args);
  }
  public guard(
    matcher: Parameters<Omnibus<Action<any>>['listen']>[0] | ActionCreator<any>,
    ...args: [any]
  ) {
    return this.bus.guard(this.toPredicate(matcher), ...args);
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
