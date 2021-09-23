import { Subject, of, asapScheduler, asyncScheduler, throwError } from 'rxjs';
import * as ExampleService from '../example/debounced-search/searchService';
import { syncThrow } from './mockListeners';

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
});
