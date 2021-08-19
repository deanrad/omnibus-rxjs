import { Subscription, of } from 'rxjs';
import { Action, ActionCreator } from 'typescript-fsa';
import { bus, Omnibus } from './bus';
import { ResultCreator, TapObserver } from './bus';
import {
  loadingCreator,
  completeCreator,
  resultCreator,
  SearchLoading,
  SearchResult,
  SearchComplete,
} from './searchService';

export type Predicate<T> = (item: T) => boolean;

/**
 *  A syntactic sugar that works like listen, but which lets ActionCreators determine the payload types and filter their matching events.
 * Requires the bus only admits Action<any>
 */
export function listenFSA<E extends Action<any>, TAction, TConsequence>(
  bus: Omnibus<E>,
  ac: ActionCreator<TAction>,
  handler: ResultCreator<Action<TAction>, TConsequence>,
  observer?: TapObserver<TConsequence>
) {
  // @ts-ignore - It cant be known if the type T could occur on the event bus (and that's ok)
  return bus.listen<Action<TAction>, TConsequence>(ac.match, handler, observer);
}

// As long as there is one instance of UI running,
// results triggered by SearchService will update the UI
// will become an event on the bus that the searchService knows how to listen to.
class UIService {
  private currentRun: Subscription;

  private updateUILoading(e: SearchLoading) {
    return of();
  }
  private updateUIResult(e: SearchResult) {
    return of();
  }
  private updateUIComplete(e: SearchComplete) {
    return of();
  }
  start() {
    // Each listener this service implements can be combined into
    // one subscription that is disposable all at once.
    this.currentRun = listenFSA(bus, loadingCreator, this.updateUILoading);
    this.currentRun.add(listenFSA(bus, resultCreator, this.updateUIResult));
    this.currentRun.add(listenFSA(bus, completeCreator, this.updateUIComplete));

    // this.currentRun = listenFSA(bus, loadingCreator, this.updateUILoading);
    // ^^^ is an alternative to vvv
    // LEFTOFF - filters are perfect for things that dont trigger more events
    // this.currentRun = bus.listen<Action<SearchLoading>, void>(
    //   loadingCreator.match,
    //   ({ payload }) => {
    //     return this.updateUILoading(payload);
    //   }
    // );
  }
  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe();
  }
}
