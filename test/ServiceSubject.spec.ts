import { ServiceSubject } from '../src/ServiceSubject';
import { after } from '../src/after';
import { of } from 'rxjs';

// Play live at
// https://codesandbox.io/s/omnibus-rxjs-servicesubject-468xn5

describe(ServiceSubject, () => {
  describe('Arguments', () => {
    describe('namespace', () => {});

    describe('handler', () => {
      it('handles a sync-value handler', () => {
        const logs = [] as string[];

        const counter = new ServiceSubject(
          'counter',
          (inc) => of(inc), // a synchronous handler
          () => counterReducer
        );
        counter.guard(counter.actions.next, ({ payload: inc = 1 }) =>
          logs.push(`Next increase: ${inc}`)
        );

        counter.state.subscribe({
          next(count) {
            logs.push(`The new count is: ${count}`);
          },
        });

        expect(logs).toEqual(['The new count is: 0']);
        counter.next(1);

        expect(logs).toEqual([
          'The new count is: 0',
          'Next increase: 1',
          'The new count is: 1',
        ]);
        counter.next(1.1);

        expect(logs).toEqual([
          'The new count is: 0',
          'Next increase: 1',
          'The new count is: 1',
          'Next increase: 1.1',
          'The new count is: 2.1',
        ]);
      });

      it('handles an async handler', async () => {
        const logs = [] as string[];

        const counter = new ServiceSubject(
          'counter',
          (inc) => after(100, inc), // a synchronous handler
          () => counterReducer
        );
        counter.guard(counter.actions.next, ({ payload: inc = 1 }) =>
          logs.push(`Next increase: ${inc}`)
        );

        counter.state.subscribe({
          next(count) {
            logs.push(`The new count is: ${count}`);
          },
        });

        expect(logs).toEqual(['The new count is: 0']);
        counter.next(1.1);
        expect(logs).toEqual(['The new count is: 0']);

        await after(101);
        expect(logs).toEqual([
          'The new count is: 0',
          'Next increase: 1.1',
          'The new count is: 1.1',
        ]);
      });
    });

    describe('reducer', () => {
      it.todo('populates #state');
    });
  });

  describe('next(): Sending requests', () => {
    it.todo('calls bus.trigger');
  });
  describe('error(): Sending requests', () => {
    it.todo('TODO Specify');
  });
  describe('complete(): Sending requests', () => {
    it.todo('TODO Specify');
  });

  describe('SubscriptionLike', () => {
    describe('unsubscribe', () => {
      it.todo('terminates all effects/handlers');
      it.todo('errs on future request');
    });
  });

  describe('#state', () => {
    it.todo('can be read via .value')
    it.todo('can be subscribed via .subscribe')
  })

  describe('Omnibus pass-throughs', () => {
    describe('reset', () => {
      it.todo('passes through');
    });
    describe('query', () => {
      it.todo('passes through');
    });
    describe('guard', () => {
      it.todo('passes through');
    });
    describe('cancelCurrent', () => {
      it.todo('TODO Specify');
    });
    describe('cancelCurrentAndQueued', () => {
      it.todo('TODO Specify');
    });
  });
});

const counterReducer = (
  count = 0,
  { type, payload: inc } = { type: '', payload: 0 }
) => {
  switch (type) {
    case 'counter/next':
      return count + inc;
    default:
      return count;
  }
};
