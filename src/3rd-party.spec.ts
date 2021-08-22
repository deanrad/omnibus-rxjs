import { Subject } from 'rxjs';
import * as ExampleService from '../example/debounced-search/searchService';
import { syncThrow } from '../test/mockListeners';

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
  it.skip('Subject observers kill the process with an uncaught error', async () => {
    // doesn't throw, but kills the test/process with an uncaught exception that cant be caught
    // rxjs/dist/cjs/internal/util/reportUnhandledError.js:13
    const notABus = new Subject();
    const listener1 = notABus.asObservable().subscribe({ next: syncThrow });

    expect(() => {
      notABus.next(null);
    }).not.toThrow();
  });
});
