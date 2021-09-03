// @ts-nocheck
import { Omnibus } from '../src/bus';
import { Action } from 'typescript-fsa';
import { asapScheduler as promiseScheduler, EMPTY, of, timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { anyEvent } from './mockPredicates';
import { after, DURATION, TestObservable } from '../src/utils'

import {
  completeCreator,
  loadingCreator,
  resultCreator,
  cancelCreator,
  searchRequestCreator,
} from '../example/debounced-search/searchService';

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
      })
    );

    it(
      'Is not vulnerable to listener errors',
      capture(miniBus, async (events) => {
        const sub = miniBus.listen(() => true, (i) => { throw new Error(`${i}`) })

        const seenErrors = [];
        // this is how an app can monitor the errors
        miniBus.errors.subscribe(e => seenErrors.push(e));

        expect(() => {
          miniBus.trigger(5);
        }).not.toThrow();

        // 5 makes it onto the bus regardless
        expect(events).toEqual([5]);

        // and the bus is still alive
        miniBus.trigger(6);
        expect(events).toEqual([5, 6]);

        // but the listener is dead
        expect(sub).toHaveProperty('closed', true)

        // and we can see the errors
        expect(seenErrors).toMatchInlineSnapshot(`
Array [
  [Error: 5],
]
`)
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
                  subscribe() {
                    FSABus.triggerMap(null, loadingCreator);
                  },
                  next(result) {
                    FSABus.trigger(result);
                  },
                  complete() {
                    FSABus.triggerMap(null, completeCreator);
                  },
                  // error also available
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
    "payload": null,
    "type": "search/loading",
  },
  Object {
    "payload": Object {
      "result": "foo",
    },
    "type": "search/result",
  },
  Object {
    "payload": null,
    "type": "search/complete",
  },
]
`);
            })
          );
        });
        describe('With a retriggering observer', () => {
          it(
            'can trigger new events with elegant syntax :)',
            capture(FSABus, (events) => {
              FSABus.listen(
                (a) => a.type === searchRequestCreator.type,
                (a) => of({ result: 'foo' }),
                null,
                {
                  subscribe: loadingCreator,
                  next: resultCreator,
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
    "payload": undefined,
    "type": "search/loading",
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
          it(
            'can trigger new events with elegant syntax :)',
            capture(FSABus, (events) => {
              const listener = FSABus.listen(
                (a) => a.type === searchRequestCreator.type,
                (a) => after(1, { result: 'foo' }),
                null,
                {
                  subscribe: loadingCreator,
                  unsubscribe: cancelCreator
                }
              );
              FSABus.trigger(searchRequestCreator({ query: 'app', id: 3.14 }));

              listener.unsubscribe();
              // We get the cancel event, and no further will arrive
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
    "payload": undefined,
    "type": "search/loading",
  },
  Object {
    "payload": undefined,
    "type": "search/cancel",
  },
]
`);
            })
          );
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

const commonObservables = [
  ['C', 'empty'],
  ['E', 'syncError'],
  ['tVC', 'resolvedPromise'],
  ['tE', 'rejectedPromise'],
  ['TVC', 'endpointValue'],
  ['TTE', 'timeout'],
  ['TE', 'endpointError'],
  ['TVE', 'dyingStream'],
  ['TTNNC', 'endpointStream'],
  ['TNTNC', 'valueStream']
]

describe.only('Robust Error Handling', () => {

  describe('Errors dont stop triggering, kill the listener, allow other listeners', () => {
    commonObservables.forEach(([eventCodes, name]) => {
      it(`${name} observable (${eventCodes})`, capture(miniBus, async (events) => {
        const subject = miniBus.listen(() => true, (i) => TestObservable(eventCodes))
        const otherListenerConsequences = []
        miniBus.listen(() => true, i => { otherListenerConsequences.push(i); return EMPTY })
        const seenErrors = [];
        miniBus.errors.subscribe(e => seenErrors.push(e));

        expect(() => {
          miniBus.trigger(5);
          // 5 makes it onto the bus regardless
          expect(events).toEqual([5]);
        }).not.toThrow();


        // and the bus is still alive
        miniBus.trigger(6);
        expect(events).toEqual([5, 6]);

        // ensure weve waited a while
        await DURATION.Timeout()
        await DURATION.Timeout()
        await DURATION.Timeout()

        // but the errant listener is dead
        if (eventCodes.endsWith('E')) {
          expect(subject).toHaveProperty('closed', true);
          // and we can see the errors
          expect(seenErrors[0]).toHaveProperty('message', 'planned error')
        }

        // and the other listener didn't stop
        expect(otherListenerConsequences).toEqual([5, 6])
      }))
    })
  })
})