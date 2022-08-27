import { Subject, concat } from 'rxjs';
import { after } from '../src/after';
import { queueOnlyLatest } from '../src/queueOnlyLatest';

describe('queueOnlyLatest', () => {
  beforeEach(() => {
    i = 0;
  });
  let i = 0;
  let checkForUpdate = () => {
    ++i;
    return concat(after(0, 'begin:' + i), after(10, 'end:' + i));
  };

  describe('with no running subscription', () => {
    it('starts one', async () => {
      const updateChecks = [] as string[];
      const queries = new Subject<void>();

      queries.pipe(queueOnlyLatest(checkForUpdate)).subscribe({
        next(u) {
          updateChecks.push(u);
        },
      });

      queries.next(); // turn on

      expect(updateChecks).toEqual(['begin:1']);
      await after(10);
      expect(updateChecks).toEqual(['begin:1', 'end:1']);
    });
  });

  describe('with an already running subscription', () => {
    it('enqueues at most one of the concurrent requests - the latest', async () => {
      let updateChecks = [] as string[];
      const queries = new Subject<void>();

      queries.pipe(queueOnlyLatest(checkForUpdate)).subscribe({
        next(u) {
          updateChecks.push(u);
        },
        error(e) {
          console.error(e);
        },
      });

      // 1 request
      queries.next();
      await after(50);
      expect(updateChecks).toEqual(['begin:1', 'end:1']);
      updateChecks = [];

      // 2 requests - breaks down to queueing
      queries.next();
      queries.next();
      await after(50);
      expect(updateChecks).toEqual(['begin:2', 'end:2', 'begin:3', 'end:3']);
      updateChecks = [];

      // 3 requests - queuesOnlyLatest
      queries.next();
      queries.next();
      queries.next();
      await after(50);
      expect(updateChecks).toEqual(['begin:4', 'end:4', 'begin:6', 'end:6']);
      updateChecks = [];

      // 4 requests - just verifying!
      queries.next();
      queries.next();
      queries.next();
      queries.next();
      await after(50);
      expect(updateChecks).toEqual(['begin:7', 'end:7', 'begin:10', 'end:10']);
      updateChecks = [];
    });
  });
});
