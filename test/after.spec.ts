import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { after } from '../src/after';

describe('after', () => {
  it('is an Observable', () => {
    expect(after(1, () => 1)).toBeInstanceOf(Observable);
  });
  it('is awaitable', async () => {
    const result = await after(1, '1.1');
    expect(result).toEqual('1.1');
  });
  it('is thenable', async () => {
    return after(1, () => 52).then((result) => {
      expect(result).toEqual(52);
    });
  });

  describe('delay arg', () => {
    describe('when 0', () => {
      it('is synchronous', () => {
        let result;
        after(0, () => {
          result = 3;
        }).subscribe();
        expect(result).toEqual(3);
      });
    });
    describe('when a promise', () => {
      it('chains onto its end', async () => {
        let result = await after(Promise.resolve(), 2);
        expect(result).toEqual(2)
      })

      it('does not invoke mapper when canceled before Promise resolves', async () => {
        let flag = false
        let result = after(Promise.resolve(), () => { flag = true }).subscribe();
        result.unsubscribe()

        await Promise.resolve()
        // still flag is false
        expect(flag).toBeFalsy()
      });

      it('recieves the value of the delay in its valueProducer', async () => {
        let result = await after(Promise.resolve(3.14), (n: number) => 2 * n)
        expect(result).toEqual(6.28)
      })
    })
  });

  describe('value arg', () => {
    describe('when a value', () => {
      it('is returned', async () => {
        const result = await after(1, 2.718);
        expect(result).toEqual(2.718);
      });
    });
    describe('when undefined', () => {
      it('is ok', async () => {
        const result = await after(1);
        expect(result).toBeUndefined();
      });
    });
    describe('when a function', () => {
      it('schedules its execution later', async () => {
        let counter = 0;
        let thenable = after(1, () => counter++);
        expect(counter).toEqual(0);
        await thenable;
        expect(counter).toEqual(1);
      });
      it('returns its return value', async () => {
        let result = await after(1, () => 2.71);
        expect(result).toEqual(2.71);
      });
    });
    describe('when an Observable', () => {
      it('defers subscription', async () => {
        const events: Array<string> = [];
        const toDefer = of(2).pipe(
          tap({
            subscribe() {
              events.push('subscribe');
            },
          })
        );
        const subject = after(1, toDefer);
        subject.subscribe();
        expect(events).toEqual([]);
        await after(2);
        expect(events).toEqual(['subscribe']);
      });
      it('yields the value', async () => {
        return after(1, of(2)).then((v) => {
          expect(v).toEqual(2);
        });
      });
    });
  });
});
