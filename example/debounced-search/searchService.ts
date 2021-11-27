// @ts-nocheck
import { actionCreatorFactory } from 'typescript-fsa';
import { concat, Subscription } from 'rxjs';
import { Omnibus } from '../../src/bus';
import { after } from '../../src/after';

const searchAction = actionCreatorFactory('search');
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
export interface SearchCanceled {
  request?: { id: number };
}

//#region "Actions We Listen For"
// Input event:
export const searchRequestCreator = searchAction<SearchRequest>('request');
//#endregion

//#region "Actions We Respond With"
/* Output event: we are loading your search.. */
export const loadingCreator = searchAction<SearchLoading>('loading');
/* Output event containing a single search result */
export const resultCreator = searchAction<SearchResult>('result');
/* Output event indicating your search has errored */
export const errorCreator = searchAction<SearchError>('error');
/* Output event indicating your search is complete */
export const completeCreator = searchAction<SearchComplete>('complete');

export const cancelCreator = searchAction<SearchCanceled>('cancel');

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
    this.currentRun = this.bus.listen(
      searchRequestCreator.match,
      getResult$,
      this.bus.observeWith({
        subscribe: loadingCreator,
        complete: completeCreator,
        next: (item) => () => item,
        error: errorCreator,
      })
    );
  }
  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe();
  }
}
