import { Subscription } from 'rxjs';
import { Action } from 'typescript-fsa';
import { bus } from './bus';
import {
  loadingCreator,
  completeCreator,
  resultCreator,
  SearchLoading,
  SearchResult,
} from './searchService';

export type Predicate<T> = (item: T) => boolean;

// As long as there is one instance of UI running,
// results triggered by SearchService will update the UI
// will become an event on the bus that the searchService knows how to listen to.
export class UIService {
  private currentRun: Subscription;
  constructor() {
    this.currentRun = new Subscription();
  }

  start() {
    // Each listener this service implements can be combined into
    // one subscription that is disposable all at once.
    this.currentRun.add(
      bus.listen<Action<SearchLoading>, void>(loadingCreator.match, () => {})
    );

    this.currentRun.add(
      bus.listen<Action<SearchResult>, void>(resultCreator.match, () => {})
    );
    this.currentRun.add(
      bus.listen<Action<any>, void>(completeCreator.match, () => {})
    );
  }

  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe();
  }
}
