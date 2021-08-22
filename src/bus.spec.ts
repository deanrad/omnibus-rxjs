import { Omnibus } from './bus';
import { Action, ActionCreator } from 'typescript-fsa';
import { of, Observable } from 'rxjs';
type BusItemType<T> = Action<T>;

import * as ExampleService from '../example/debounced-search/searchService';
const { completeCreator, searchRequestCreator } = ExampleService;

// TODO this is awkward to have to do, but necessary to type listen for FSAs
type TRequest = ReturnType<typeof searchRequestCreator>;
type TComplete = ReturnType<typeof completeCreator>;
type TResult = ReturnType<typeof ExampleService.resultCreator>;

function captureEvents<T>(testFn: (arg: T[]) => void | Promise<any>) {
  return function () {
    const seen = new Array<T>();
    // @ts-ignore
    const sub = FSABus.query(() => true).subscribe((event) => seen.push(event));
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

describe('Bus', () => {
  it('can be instantiated with the BusItemType it will accept', () => {
    expect(FSABus).toBeTruthy();
  });

  describe('#query', () => {
    it.todo('Returns an Observable of matching events');
  });

  describe('#trigger', () => {
    it.todo('puts an action on the bus');
  });

  describe('#triggerMap', () => {
    it.todo('puts an action on the bus through a mapping function');
  });

  describe('#listen', () => {
    describe('Handler', () => {
      describe('Returning Observables', () => {
        describe('With a callback-based observer', () => {
          it(
            'can trigger new events',
            captureEvents((seen) => {
              FSABus.listen(
                (a) => a.type === searchRequestCreator.type,
                (a) => of(ExampleService.resultCreator({ result: 'foo' })),
                {
                  next(result) {
                    FSABus.trigger(result);
                  },
                }
              );
              FSABus.trigger(searchRequestCreator({ query: 'app', id: 3.14 }));

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
            })
          );
        });
        describe('LEFTOFF With a retriggering observer', () => {
          it.todo('can trigger new events with elegant syntax :)');
        });
      });
    });
  });

  describe('#reset', () => {
    it.todo('ends all listeners');
    it.todo('ends all handlers');
  });
});
