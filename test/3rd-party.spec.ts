import { of, asapScheduler, asyncScheduler, Subject } from 'rxjs';
import * as ExampleService from '../example/debounced-search/searchService';

/** Specs that document how 3rd party libs we may use interact */
describe('Reference: FSA', () => {
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
    expect(ExampleService.searchRequestCreator.match).toMatchInlineSnapshot(
      `[Function]`
    );
  });
});

describe('Reference: RxJS', () => {
  // doesn't throw, but kills the test/process with an uncaught exception that cant be caught
  // rxjs/dist/cjs/internal/util/reportUnhandledError.js:13

  // An Observable can represent any interleaving of values, sync or async
  // Let's verify that some mnemonically named ones behave as we expect.
  describe('Observable subscriptions', () => {
    it('can deliver events synchronously', () => {
      const subject = of(2);
      let result;
      subject.subscribe((n) => {
        result = n;
      });
      expect(result).toEqual(2);
    });

    it('can deliver events with Promise (microqueue) timing', async () => {
      const subject = of(2, asapScheduler);
      let result;
      subject.subscribe((n) => {
        result = n;
      });
      expect(result).toBeUndefined();
      await Promise.resolve();
      expect(result).toEqual(2);
    });

    it('can deliver events with setTimeout(0) (macroqueue) timing', async () => {
      const subject = of(2, asyncScheduler);
      let result;
      subject.subscribe((n) => {
        result = n;
      });
      expect(result).toBeUndefined();
      await Promise.resolve();
      expect(result).toBeUndefined();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(result).toEqual(2);
    });
  });

  describe('Subjects', () => {
    describe('Errors', () => {
      it('subject.complete() stops listeners ', () => {
        const s = new Subject<number>();
        const seen = [] as number[];
        const listener1 = s.asObservable().subscribe({
          next(v) {
            seen.push(v);
          },
        });
        expect(listener1.closed).toBeFalsy();

        s.next(1);
        expect(seen).toEqual([1]);

        s.complete();
        s.next(2);
        expect(seen).toEqual([1]);
        expect(listener1.closed).toBeTruthy();

        // closed is false even after await Promise.resolve();
        expect(s).toMatchInlineSnapshot(`
          Subject {
            "closed": false,
            "currentObservers": null,
            "hasError": false,
            "isStopped": true,
            "observers": Array [],
            "thrownError": null,
          }
        `);
      });
      it('subject.error() stops listeners', () => {
        const s = new Subject<number>();
        const seen = [] as number[];
        const seenErrors = [] as string[];
        const listener1 = s.asObservable().subscribe({
          next(v) {
            seen.push(v);
          },
          // must rescue or breaks jest process
          error(e) {
            seenErrors.push(e);
          },
        });
        expect(listener1.closed).toBeFalsy();

        s.next(1);
        expect(seen).toEqual([1]);

        s.error('Oops');
        s.next(2);
        expect(seen).toEqual([1]);
        expect(listener1.closed).toBeTruthy();
        expect(seenErrors).toMatchInlineSnapshot(`
          Array [
            "Oops",
          ]
        `);

        // closed is false even after await Promise.resolve();
        expect(s).toMatchInlineSnapshot(`
          Subject {
            "closed": false,
            "currentObservers": null,
            "hasError": true,
            "isStopped": true,
            "observers": Array [],
            "thrownError": "Oops",
          }
        `);

        // s.closed happens only on unsubscribe (not useful to do)
        s.unsubscribe();
        expect(s.closed).toBeTruthy();
      });
      it.skip('kill the host process if a sync error not caught', () => {
        const s = new Subject<number>();
        const seen = [] as number[];
        const badSync = s.asObservable().subscribe({
          next(v) {
            throw new Error();
          },
        });
        s.next(-1); // kills the process
      });
      it.skip('creates unhandled reject  the host process if a sync error not caught', () => {
        const s = new Subject<number>();
        const seen = [] as number[];
        const badSync = s.asObservable().subscribe({
          next(v) {
            Promise.resolve().then(() => {
              throw new Error('async oops');
            });
          },
        });
        // Results in
        // [UnhandledPromiseRejection: This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). The promise rejected with the reason "Error: async oops".] {
        //   code: 'ERR_UNHANDLED_REJECTION'
        s.next(-1);
      });
    });
  });
});
