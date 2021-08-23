import { actionCreatorFactory } from 'typescript-fsa';
import { concat, Subscription } from 'rxjs';
import { Omnibus } from '../../src/bus';
import { after } from '../../src/utils';

const namespace = actionCreatorFactory('search');
export interface SearchRequest {
  query: string;
  id?: number;
}
export interface SearchLoading {
  request?: { id: number };
}
export interface SearchComplete {
  request?: { id: number };
  result: [string];
}
export interface SearchError extends Error {
  request?: { id: number };
}
/**  An individual result*/
export interface SearchResult {
  result: string;
  request?: { id: number };
}

//#region "Actions We Listen For"
// Input event:
export const searchRequestCreator = namespace<SearchRequest>('request');
//#endregion

//#region "Actions We Respond With"
/* Output event: we are loading your search.. */
export const loadingCreator = namespace<SearchLoading>('loading');
/* Output event containing a single search result */
export const resultCreator = namespace<SearchResult>('result');
/* Output event indicating your search has errored */
export const errorCreator = namespace<SearchError>('error');
/* Output event indicating your search is complete */
export const completeCreator = namespace<SearchComplete>('complete');

// A mock Observable creator - note - returns results progressively! (not all at the end, as in Promises)
export function getResult$(action: ReturnType<typeof searchRequestCreator>) {
  // console.log('trace: getting result$')
  const { query } = action.payload;
  const results = [
    { result: 'abba', id: 5 },
    { result: 'apple' },
    { result: 'application' },
    { result: query },
  ].map((p) => after(250, resultCreator(p)));
  return concat(...results);
}

// The consumer of an instance of QueryService is any Component
// that can control its lifetime
export class SearchService {
  private currentRun: Subscription;
  constructor(public bus: Omnibus<any>) {
    console.log('Search service started');
  }

  start() {
    this.currentRun = this.bus.listen(searchRequestCreator.match, getResult$, {
      subscribe: () => {
        this.bus.triggerMap(null, loadingCreator);
      },
      complete: () => {
        this.bus.triggerMap(null, completeCreator);
      },
      next: (item) => {
        this.bus.trigger(item);
      },
      error: (err) => {
        this.bus.triggerMap(err, errorCreator);
      },
    });
  }
  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe();
  }
}
