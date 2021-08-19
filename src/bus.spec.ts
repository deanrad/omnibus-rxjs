import { Omnibus } from './bus';
import { Action, ActionCreator } from 'typescript-fsa';
import { of, Observable } from 'rxjs';
type BusItemType<T> = Action<T>;

import * as ExampleService from '../example/debounced-search/searchService';
const { completeCreator, searchRequestCreator } = ExampleService;
// TODO this is awkward to have to do
type TRequest = ReturnType<typeof searchRequestCreator>;
type TComplete = ReturnType<typeof completeCreator>;
type TResult = ReturnType<typeof ExampleService.resultCreator>;

function captureEvents<T>(testFn: (arg: T[]) => void | Promise<any>) {
  return function() {
    const seen = new Array<T>();
    // @ts-ignore
    const sub = FSABus.query(() => true).subscribe(event => seen.push(event));
    const result: any = testFn(seen);
    // allow async functions to await - but ensure cleanup
    if (result && result.then) {
      return result.finally(() => sub.unsubscribe());
    }
    // unsubscribe is idempotent
    sub.unsubscribe();
    return result;
  };
}

const FSABus = new Omnibus<Action<any>>();

describe('FSA', () => {
  it('creates an action', () => {
    const action = ExampleService.searchRequestCreator({ query: 'app' });
    expect([action]).toMatchInlineSnapshot(`
Array [
  Object {
    "payload": Object {
      "query": "app",
    },
    "type": "search/request",
  },
]
`);
  });
  it('provides a predicate #match', () => {
    expect(ExampleService.searchRequestCreator.match).toMatchInlineSnapshot(`[Function]`);
  })
});
describe('Bus', () => {
  it('can be instantiated with the BusItemType it will accept', () => {
    expect(FSABus).toBeTruthy();
  });
  it('can listen for actions of its type', captureEvents((seen) => {
    FSABus.listen<TRequest, TResult>(
      a => a.type === searchRequestCreator.type,
      (a) => of(ExampleService.resultCreator({ result: 'foo' }))
    );
    FSABus.trigger(searchRequestCreator({query: 'app', id: 3.14}))
    
    expect(seen).toMatchInlineSnapshot(`
Array [
  Object {
    "payload": Object {
      "id": 3.14,
      "query": "app",
    },
    "type": "search/request",
  },
  Object {
    "payload": Object {
      "result": "foo",
    },
    "type": "search/result",
  },
]
`);
  }));
});

