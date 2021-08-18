import { actionCreatorFactory, Action } from 'typescript-fsa';
import { from, of, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';
import { bus } from './bus';

const namespace = actionCreatorFactory('search');
interface SearchRequest {
  query: string;
  id: number;
}
interface SearchLoading {
  request?: { id: number };
}
interface SearchComplete {
  request?: { id: number };
}
interface SearchError extends Error {
  request?: { id: number };
}
/**  An individual result*/
interface SearchResult {
  result: string;
  request?: { id: number };
}

//#region "Actions We Listen For"
// Input event:
export const searchRequestCreator = namespace<SearchRequest>('request');
//#endregion

//#region "Actions We Listen For"
/* Output event: we are loading your search.. */
export const loadingCreator = namespace<SearchLoading>('loading');
/* Output event containing a single search result */
export const resultCreator = namespace<SearchResult>('result');
/* Output event indicating your search has errored */
export const errorCreator = namespace<SearchError>('error');
/* Output event indicating your search is complete */
export const completeCreator = namespace<SearchComplete>('complete');

// A mock Observable creator - note - returns results progressively! (not all at the end, as in Promises)
function getResult$(action: ReturnType<typeof searchRequestCreator>) {
  const { query } = action.payload;
  const results: Array<SearchResult> = [
    { result: 'abba' },
    { result: 'apple' },
    { result: 'application' },
    { result: query },
  ];
  return of(...results);
}

// The consumer of an instance of QueryService is any Component
// that can control its lifetime
export class QueryService {
  private currentRun: Subscription;

  start() {
    this.currentRun = bus.listen<Action<SearchRequest>, SearchResult>(
      searchRequestCreator.match,
      getResult$,
      {
        start() {
          bus.trigger(loadingCreator(null));
        },
        complete() {
          bus.trigger(completeCreator(null));
        },
        next(item) {
          bus.triggerMap(item, resultCreator);
        },
        error(err) {
          bus.triggerMap(err, errorCreator);
        },
      }
    );
  }
  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe();
  }
}
