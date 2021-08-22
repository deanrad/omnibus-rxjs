import { Omnibus } from './bus';
import { Action } from 'typescript-fsa';
import { asapScheduler as promiseScheduler, of, timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { anyEvent } from '../test/mockPredicates';

import {
  completeCreator,
  resultCreator,
  searchRequestCreator,
} from '../example/debounced-search/searchService';

// TODO this is awkward to have to do, but necessary to type listen for FSAs
type TRequest = ReturnType<typeof searchRequestCreator>;
type TComplete = ReturnType<typeof completeCreator>;
type TResult = ReturnType<typeof resultCreator>;

function capture<T>(
  bus: Omnibus<T>,
  testFn: (arg: T[]) => void | Promise<any>
) {
  return function () {
    const seen = new Array<T>();
    // @ts-ignore
    const sub = bus.query(() => true).subscribe((event) => seen.push(event));
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
const miniBus = new Omnibus<number>();

describe('Bus', () => {
  beforeEach(() => {
    FSABus.reset();
    miniBus.reset();
  });

  it('can be instantiated with the BusItemType it will accept', () => {
    expect(FSABus).toBeTruthy();
  });

  describe('#query', () => {
    it('Returns an Observable of matching events', () => {
      const events = [];
      miniBus
        .query(anyEvent)
        .pipe(tap((e) => events.push(e)))
        .subscribe();
      miniBus.trigger(3.14);
      miniBus.trigger(2.71828);
      expect(events).toEqual([3.14, 2.71828]);
    });
    it('Returns an Observable of filtered events', () => {
      const events = [];
      miniBus
        .query((n) => n < 3)
        .pipe(tap((e) => events.push(e)))
        .subscribe();
      miniBus.trigger(3.14);
      miniBus.trigger(2.71828);
      expect(events).toEqual([2.71828]);
    });
    it.todo('is canceled by a reset');
  });

  describe('#trigger', () => {
    it(
      'puts an action on the bus',
      capture(miniBus, (events) => {
        miniBus.trigger(5);
        expect(events).toEqual([5]);
        // expect(true).toBeFalsy();
      })
    );
  });

  describe('#triggerMap', () => {
    it(
      'puts an action on the bus through a mapping function',
      capture(miniBus, (events) => {
        miniBus.triggerMap(5, (n) => n * 2);
        expect(events).toEqual([10]);
      })
    );
  });

  describe('#listen', () => {
    describe('Handler', () => {
      describe('Returning Observables', () => {
        describe('With a callback-based observer', () => {
          it(
            'can trigger new events',
            capture(FSABus, (events) => {
              FSABus.listen(
                (a) => a.type === searchRequestCreator.type,
                (a) => of(resultCreator({ result: 'foo' })),
                {
                  next(result) {
                    FSABus.trigger(result);
                  },
                }
              );
              FSABus.trigger(searchRequestCreator({ query: 'app', id: 3.14 }));

              expect(events).toMatchInlineSnapshot(`
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
    it('ends all listeners', () => {
      const microBus = new Omnibus<number>();
      const events = [];
      const listener = microBus.listen(
        (n) => n == 1,
        (one) => {
          return of(one + 1).pipe(tap((two) => events.push(two)));
        }
      );

      microBus.reset();

      // further triggerings have no effect
      microBus.trigger(1);
      expect(events).toHaveLength(0); // not two
      // and our listener is forever closed
      expect(listener).toHaveProperty('closed', true);
    });
    it(
      'ends all handlers',
      capture(miniBus, async (events) => {
        // @ts-ignore
        miniBus.listen(
          (n) => n === 1,
          () =>
            // after a Promise resolution, trigger 3
            timer(0, promiseScheduler).pipe(
              tap(() => {
                miniBus.trigger(3);
              })
            )
        );
        // The handler will have begun but..
        miniBus.trigger(1);
        // Unsubscribe before the handler's observable has completed
        miniBus.reset();

        // Wait long enough to have seen the result if not canceled by reset
        await Promise.resolve();
        // seen would have 1 and 3 if we didn't cancel the in-flight
        expect(events).toEqual([1]);
      })
    );
  });
});
