// @ts-nocheck
import {
  asapScheduler as promiseScheduler,
  asyncScheduler as timeoutScheduler,
  concat,
  empty,
  EMPTY,
  of,
  Observable,
  throwError,
  timer,
} from 'rxjs';
import { tap } from 'rxjs/operators';
import invariant from 'tiny-invariant';
import { Action } from 'typescript-fsa';
import {
  completeCreator,
  loadingCreator,
  resultCreator,
  searchRequestCreator,
} from '../example/debounced-search/searchService';
import { Omnibus } from '../src/bus';
import { after, DURATION } from '../src/utils';
import { anyEvent } from './mockPredicates';

function capturing<T>(
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

/** Concatenable Observables corresponding to DURATION.
 * Keyed off:
 *   V - a value (synchronous unless preceeded by t/T)
 *   E - an error
 *   t - a microtask tick (Promise resolution)
 *   T - a macrotask tick (setTimeout(fn,0))
 *   C - a completion
 */
export const EXECUTION = {
  V: () => of('V'),
  C: () => EMPTY,
  E: () => throwError(() => new Error('planned error')),
  t: () => empty(promiseScheduler),
  T: () => empty(timeoutScheduler),
};

/** Factory for Observable executions using mnemonics */
export const TestObservable = (code: string) => {
  invariant(code.endsWith('C') || code.endsWith('E'), 'Must end in C or E.');
  const parts = code.split('');
  let all = EMPTY as Observable<unknown>;
  for (let part of parts) {
    all = concat(all, EXECUTION[part]());
    if (['C', 'E'].includes(part)) {
      return all;
    }
  }
  return all;
};

const withTiming = (events) => {
  return concat(
    ...events.map(([time, valOrFn]) => {
      return after(time, valOrFn);
    })
  );
};
const FSABus = new Omnibus<Action<any>>();
const StringBus = new Omnibus<string>();
const miniBus = new Omnibus<number>();

describe('Bus', () => {
  beforeEach(() => {
    FSABus.reset();
    miniBus.reset();
    StringBus.reset();
  });

  describe('Typings', () => {
    interface Foo {
      foo: string;
      value?: string;
    }
    interface Bar extends Foo {
      bar: string;
      value?: string;
    }

    it('types - can make more actions', async () => {
      const b = new Omnibus<Foo | Bar>();
      const seen: Array<Foo | Bar> = [];

      b.spy((foo) => seen.push(foo));
      // b.listen<Foo,Bar>(
      b.listen<Bar>(
        (e) => !!e.foo,
        (e) => {
          // return any ObservableInput
          // return of({ bar: e.foo } as Bar);
          return Promise.resolve({ bar: `i was: ${e.foo}` } as Bar);
        },
        b.observeAll()
      );
      b.trigger({ foo: 'im foo' });
      await Promise.resolve();
      expect(seen).toMatchInlineSnapshot(`
Array [
  Object {
    "foo": "im foo",
  },
  Object {
    "bar": "i was: im foo",
  },
]
`);
    });
  });
  it('can be instantiated with the BusItemType it will accept', () => {
    expect(FSABus).toBeTruthy();
  });

  describe('#query', () => {
    describe('With a Predicate', () => {
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
      it('is canceled by a reset', () => {
        const sub = miniBus.query(() => true).subscribe();
        expect(sub).toHaveProperty('closed', false);
        miniBus.reset();
        expect(sub).toHaveProperty('closed', true);
      });
    });
    describe('With a raw value', () => {
      it.todo('matches on equality of a value type');
      it.todo('matches on subset of an object type');
    });
    describe('With an FSA matcher', () => {
      it('works just like a predicate', () => {
        expect.assertions(0);
      });
    });
  });

  describe('#trigger', () => {
    it(
      'puts an action on the bus',
      capturing(miniBus, (events) => {
        miniBus.trigger(5);
        expect(events).toEqual([5]);
      })
    );

    it(
      'Is not vulnerable to listener errors',
      capturing(miniBus, async (events) => {
        const sub = miniBus.listen(
          () => true,
          (i) => {
            throw new Error(`${i}`);
          }
        );

        const seenErrors = [];
        // this is how an app can monitor the errors
        miniBus.errors.subscribe((e) => seenErrors.push(e));

        expect(() => {
          miniBus.trigger(5);
        }).not.toThrow();

        // 5 makes it onto the bus regardless
        expect(events).toEqual([5]);

        // and the bus is still alive
        miniBus.trigger(6);
        expect(events).toEqual([5, 6]);

        // but the listener is dead
        expect(sub).toHaveProperty('closed', true);

        // and we can see the errors
        expect(seenErrors).toMatchInlineSnapshot(`
Array [
  [Error: 5],
]
`);
      })
    );
  });

  describe('#listen', () => {
    describe('Handler', () => {
      describe('Returning Observables', () => {
        describe('retriggering via observeWith', () => {
          it(
            'can send events from effects back through the bus',
            capturing(FSABus, (events) => {
              // Set up the listener:
              // on events of searchRequest
              // return an observable of next:{result: 'foo'}
              FSABus.listen(
                searchRequestCreator.match,
                () => of({ result: 'foo' }),
                FSABus.observeWith({
                  subscribe: loadingCreator,
                  next: resultCreator,
                  complete: completeCreator,
                })
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
  Object {
    "payload": undefined,
    "type": "search/complete",
  },
]
`);
            })
          );
        });
        describe('retrigging via observeAll', () => {
          it(
            'puts all return values (not complete/error) directly back on the bus ',
            capturing(StringBus, async (events) => {
              StringBus.listen(
                (s) => s === 'FOO',
                () => () => Promise.resolve('BAR'),
                StringBus.observeAll()
              );
              StringBus.trigger('FOO');
              StringBus.trigger('NOTFOO');
              await after(1);
              expect(events).toEqual(['FOO', 'NOTFOO', 'BAR']);
            })
          );
        });
      });
      describe('Returning Promises', () => {
        describe('With a callback-based observer', () => {
          it(
            'can trigger new events',
            capturing(StringBus, async (events) => {
              StringBus.listen(
                (a) => a === 'bang',
                () => Promise.resolve('fooP'),
                StringBus.observeWith({
                  next: (v) => v,
                })
              );
              StringBus.trigger('bang');
              await DURATION.Timeout();
              expect(events).toHaveLength(2);
              expect(events).toMatchInlineSnapshot(`
Array [
  "bang",
  "fooP",
]
`);
            })
          );
        });
      });
      describe('Returning functions', () => {
        it(
          'can return 0-arity function to call defer()',
          capturing(StringBus, async (events) => {
            StringBus.listen(
              (s) => s === 'FOO',
              () => () => Promise.resolve('BAR'),
              StringBus.observeAll()
            );
            StringBus.trigger('FOO');
            StringBus.trigger('NOTFOO');
            await after(1);
            expect(events).toEqual(['FOO', 'NOTFOO', 'BAR']);
          })
        );
        it('can return 1-arity function to create Observable via new Observable()', async () => {
          StringBus.listen(
            (s) => s === 'FOO',
            // dont need to import Observable, just return a function
            () => (o) => {
              // my next/error/complete get observed in the next argument
              o.next('BARRR');
              // succeeds
              o.next('BAR2');
              // doesnt come through - WHY?
              Promise.resolve().then(() => {
                o.next('BAR3');
              });
              o.complete();
            },
            // feed responded events back in (optionally mapping)
            StringBus.observeWith({
              next: (x) => x,
            })
          );

          const seen: Array<string> = [];
          StringBus.spy((e) => {
            seen.push(e);
          });

          StringBus.trigger('FOO');
          StringBus.trigger('NOTFOO');
          await Promise.resolve(); //after(200);
          expect(seen).toEqual(['FOO', 'BARRR', 'BAR2', 'NOTFOO']);
        });
      });
      describe('Can return any ObservableInput', () => {
        it(
          'Unpacks strings since theyre Iterable',
          capturing(StringBus, (events) => {
            StringBus.listen(
              (a) => a === 'bang',
              () => 'whoa',
              {
                next(result) {
                  StringBus.trigger(result);
                },
              }
            );
            StringBus.trigger('bang');
            expect(events).toHaveLength(5);
            expect(events).toMatchInlineSnapshot(`
Array [
  "bang",
  "w",
  "h",
  "o",
  "a",
]
`);
          })
        );
        it(
          'Works with generators',
          capturing(StringBus, async (events) => {
            StringBus.listen(
              (a) => a === 'bang',
              () => {
                const gen = function* () {
                  yield 'one';
                  yield 'two';
                };
                // gotta return the iterator
                return gen();
              },
              {
                next(result) {
                  StringBus.trigger(result);
                },
              }
            );
            await DURATION.Promise();
            StringBus.trigger('bang');
            expect(events).toHaveLength(3);
            expect(events).toEqual(['bang', 'one', 'two']);
          })
        );
        it(
          'allows for no/void return value',
          capturing(StringBus, () => {
            const seen = [];
            StringBus.listen(
              () => true,
              function voidReturn(e) {
                seen.push(e);
              }
            );

            StringBus.trigger('FIZZ');
            StringBus.trigger('BUZZ');
            // The listener ran twice (didnt die on no return)
            expect(seen).toEqual(['FIZZ', 'BUZZ']);
          })
        );
      });
    });
  });
  describe('#listenQueueing (same signature as #listen, but with concatMap)', () => {
    it('serializes execution', async () => {
      const calls = [];
      const listenerSpy = jest.fn().mockImplementation((i) => {
        calls.push(`start:${i}`);
        return after(10, () => calls.push(`done:${i}`));
      });
      miniBus.listenQueueing(() => true, listenerSpy);
      miniBus.trigger(1);
      miniBus.trigger(2);

      await after(30 + 1);
      // prettier-ignore
      expect(calls).toEqual([
        'start:1',
        'done:1',
        'start:2',
        'done:2'
      ]);
    });
  });
  describe('#listenSwitching (same signature as #listen, but with switchMap)', () => {
    it('cancels existing, and starts a new Subscription', async () => {
      const calls = [];
      const listenerSpy = jest.fn().mockImplementation((i) => {
        return withTiming([
          [0, () => calls.push(`start:${i}`)],
          [10, () => calls.push(`done:${i}`)],
        ]);
      });
      miniBus.listenSwitching(() => true, listenerSpy);
      miniBus.trigger(1);
      miniBus.trigger(2);

      await after(30 + 1);
      // prettier-ignore
      expect(calls).toEqual([
        'start:1',
        'start:2',
        'done:2'
      ]);
    });
  });
  describe('#listenBlocking (same signature as #listen, but with exhaustMap)', () => {
    it('cancels existing, and starts a new Subscription', async () => {
      const calls = [];
      const listenerSpy = jest.fn().mockImplementation((i) => {
        return withTiming([
          [0, () => calls.push(`start:${i}`)],
          [10, () => calls.push(`done:${i}`)],
        ]);
      });
      miniBus.listenBlocking(() => true, listenerSpy);
      miniBus.trigger(1);
      miniBus.trigger(2);

      await after(30 + 1);
      // prettier-ignore
      expect(calls).toEqual([
        'start:1',
        'done:1',
      ]);
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
      capturing(miniBus, async (events) => {
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

  describe('#spy', () => {
    it('calls the function passed to it on any event, before any listener', () => {
      const seen = [];
      const listenerSpy = jest.fn().mockImplementation(() => {
        seen.push('seen by spy');
      });
      miniBus.listen(
        () => true,
        () => {
          seen.push('seen by nonspy');
        }
      );

      miniBus.spy(listenerSpy);
      miniBus.trigger(NaN);
      expect(listenerSpy).toHaveBeenCalledTimes(1);
      expect(seen).toEqual(['seen by spy', 'seen by nonspy']);
    });

    it('returns a subscription for cancelation', () => {
      const seen = [];
      const listenerSpy = jest.fn().mockImplementation(() => {
        seen.push('seen by spy');
      });

      const sub = miniBus.spy(listenerSpy);
      miniBus.trigger(1);
      expect(listenerSpy).toHaveBeenCalledTimes(1);

      sub.unsubscribe();
      miniBus.trigger(1.1);
      expect(listenerSpy).toHaveBeenCalledTimes(1);
    });

    describe('#spy #spy', () => {
      it('runs spies in the order appended', () => {
        const seen = [];
        miniBus.spy(() => {
          seen.push(1);
        });
        miniBus.spy(() => {
          seen.push(2);
        });
        miniBus.trigger(Math.PI);
        expect(seen).toEqual([1, 2]);
      });
    });
  });

  describe('#guard', () => {
    it.todo('returns a subscription for cancelation');

    describe('callback', () => {
      it.todo('is called on matching events');
      describe('when it throws', () => {
        it('allows rejection of bus items by throwing', () => {
          const seen = [];

          miniBus.listen(
            () => true,
            (i) => {
              seen.push(i);
            }
          );
          miniBus.guard(
            (i) => i === 3.14,
            () => {
              throw 'No rounded transcendentals!';
            }
          );

          miniBus.trigger(3.13);
          expect(() => {
            miniBus.trigger(3.14);
          }).toThrow('No rounded transcendentals!');

          expect(seen).toEqual([3.13]);
        });
        it('doesnt terminate the guard when throwing', () => {
          const seen = [];

          miniBus.spy((i) => seen.push(i));
          miniBus.guard(
            (i) => i === 3.14,
            () => {
              throw 'No rounded transcendentals!';
            }
          );

          miniBus.trigger(3.13);
          expect(() => {
            miniBus.trigger(3.14);
          }).toThrow('No rounded transcendentals!');

          // still errs
          expect(() => {
            miniBus.trigger(3.14);
          }).toThrow('No rounded transcendentals!');

          // didnt break the bus
          miniBus.trigger(3.15);

          expect(seen).toEqual([3.13, 3.15]);
        });
      });
      describe('return value', () => {
        it('can mutate the payload', () => {
          const seen = [];

          FSABus.guard(
            ({ type }) => type === 'foo',
            (e) => {
              e.payload.timestamp = Date.now().toString().substr(0, 3);
            }
          );
          FSABus.listen(
            () => true,
            (e) => {
              seen.push(e);
            }
          );

          // mutates the payload
          const payload = { fooId: 'bazž' };
          FSABus.trigger({ type: 'foo', payload });

          expect(seen).toMatchInlineSnapshot(`
Array [
  Object {
    "payload": Object {
      "fooId": "bazž",
      "timestamp": "163",
    },
    "type": "foo",
  },
]
`);
        });

        // it('LEFTOFF can return a new payload to sub out for listeners', () => {
        //   const seenTypes: Array<string> = [];
        //   FSABus.guard(
        //     ({ type }) => type === 'file/request',
        //     (e) => {
        //       return { type: 'auth/check', payload: e.payload };
        //     }
        //   );
        //   FSABus.listen(
        //     () => true,
        //     (e) => {
        //       seenTypes.push(e.type);
        //     }
        //   );

        //   FSABus.trigger({
        //     type: 'file/request',
        //     payload: { path: '/foo.txt' },
        //   });

        //   // the filter replaces the event
        //   expect(seenTypes).toContain('auth/check');
        // });
      });
    });

    describe('#guard #guard', () => {
      it('runs guards in the order created', () => {
        const seen = [];

        miniBus.guard(
          () => true,
          () => {
            seen.push(1);
          }
        );
        miniBus.guard(
          () => true,
          () => {
            seen.push(2);
          }
        );

        miniBus.trigger('foo'.length);
        expect(seen).toEqual([1, 2]);
      });
    });

    describe('#spy #guard', () => {
      it('runs guards before any spies', () => {
        const seen = [];

        miniBus.spy(() => seen.push(2));
        miniBus.guard(
          () => true,
          () => seen.push(1)
        );

        miniBus.trigger('foo'.length);
        expect(seen).toEqual([1, 2]);
      });
    });
  });

  describe('#filter', () => {
    it.todo('returns a subscription for cancelation');
    describe('callback', () => {
      it(
        'may replace the action with another, after guards and before spies',
        capturing(StringBus, (seen) => {
          StringBus.filter(
            () => true,
            (s) => s.substr(0, 4)
          );
          StringBus.trigger('BOOYEAH');

          expect(seen).toEqual(['BOOY']);
        })
      );
    });
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
  ['TNTNC', 'valueStream'],
];

describe('Robust Error Handling', () => {
  describe('Errors dont stop triggering, kill the listener, allow other listeners', () => {
    commonObservables.forEach(([eventCodes, name]) => {
      it(
        `${name} observable (${eventCodes})`,
        capturing(miniBus, async (events) => {
          const subject = miniBus.listen(
            () => true,
            () => TestObservable(eventCodes)
          );
          const otherListenerConsequences = [];
          miniBus.listen(
            () => true,
            (i) => {
              otherListenerConsequences.push(i);
              return EMPTY;
            }
          );
          const seenErrors = [];
          miniBus.errors.subscribe((e) => seenErrors.push(e));

          expect(() => {
            miniBus.trigger(5);
            // 5 makes it onto the bus regardless
            expect(events).toEqual([5]);
          }).not.toThrow();

          // and the bus is still alive
          miniBus.trigger(6);
          expect(events).toEqual([5, 6]);

          // ensure weve waited a while
          await DURATION.Timeout();
          await DURATION.Timeout();
          await DURATION.Timeout();

          // but the errant listener is dead
          if (eventCodes.endsWith('E')) {
            expect(subject).toHaveProperty('closed', true);
            // and we can see the errors
            expect(seenErrors[0]).toHaveProperty('message', 'planned error');
          }

          // and the other listener didn't stop
          expect(otherListenerConsequences).toEqual([5, 6]);
        })
      );
    });
  });
});
