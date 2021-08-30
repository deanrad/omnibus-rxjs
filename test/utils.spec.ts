import { asapScheduler, from, concat, of, materialize, merge, toArray, asyncScheduler, firstValueFrom, Observable } from "rxjs";
import { startWith, zipWith } from "rxjs/operators";
import { AWAITABLE, DURATION, TestObservable, THRESHOLD, after } from "../src/utils";

describe('TestDurations', () => {
  it('Sync', () => {
    const subject = DURATION.Sync(1)
    expect(subject).toEqual(1)
  });

  it('Promise', async () => {
    const subject = DURATION.Promise('x');
    expect(subject).not.toEqual('x');
    expect(subject).toBeInstanceOf(Promise)
    const result = await subject;
    expect(result).toEqual('x')
  });

  it('Timeout', async () => {
    let result;
    const subject = DURATION.Timeout('x').then(x => { result = x });
    expect(subject).not.toEqual('x');
    expect(subject).toBeInstanceOf(Promise)
    await Promise.resolve();
    expect(result).not.toEqual('x');
    await subject
    expect(result).toEqual('x')
  });

});

describe('TestObservbles', () => {
  it('VC - a synchronous value and completion', () => {
    let result: any = -1;
    const events = TestObservable('VC')
      .pipe(materialize(), toArray());
    events.subscribe(e => { result = e })
    expect(result).toMatchInlineSnapshot(`
Array [
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "V",
  },
  Notification {
    "error": undefined,
    "hasValue": false,
    "kind": "C",
    "value": undefined,
  },
]
`);
  });

  it('tVC - a promise resolved after a tick', async () => {
    const ticks = of('t0')
    const subject = merge(TestObservable('tVC'), ticks);
    let events;
    subject.pipe(materialize(), toArray()).subscribe(all => { events = all })

    await DURATION.Timeout();
    expect(events).toMatchInlineSnapshot(`
Array [
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "t0",
  },
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "V",
  },
  Notification {
    "error": undefined,
    "hasValue": false,
    "kind": "C",
    "value": undefined,
  },
]
`);

  });

  it('tE - a rejected Promise', async () => {
    const ticks = of('t0')
    const subject = merge(TestObservable('tE'), ticks);
    let events;
    subject.pipe(materialize(), toArray()).subscribe(all => { events = all })

    await DURATION.Timeout();
    expect(events).toMatchInlineSnapshot(`
Array [
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "t0",
  },
  Notification {
    "error": [Error: planned error],
    "hasValue": false,
    "kind": "E",
    "value": undefined,
  },
]
`);
  });

  it('TV - a value after a timeout', async () => {
    const ticks = from(['t0'], asapScheduler);
    const subject = merge(TestObservable('TV'), ticks);
    let events;
    subject.pipe(materialize(), toArray()).subscribe(all => { events = all })

    await DURATION.Timeout();
    await DURATION.Timeout();
    expect(events).toMatchInlineSnapshot(`
Array [
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "t0",
  },
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "V",
  },
  Notification {
    "error": undefined,
    "hasValue": false,
    "kind": "C",
    "value": undefined,
  },
]
`);
  });

  it('VVC - a mutivalued sync iterable', async () => {
    const ticks = from(['t0'], asapScheduler);
    const subject = TestObservable('VVC')
    let events;
    subject.pipe(materialize(), toArray()).subscribe(all => { events = all })

    expect(events).toMatchInlineSnapshot(`
Array [
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "V",
  },
  Notification {
    "error": undefined,
    "hasValue": true,
    "kind": "N",
    "value": "V",
  },
  Notification {
    "error": undefined,
    "hasValue": false,
    "kind": "C",
    "value": undefined,
  },
]
`);
  });

  describe('Awaitable intervals of time', () => {

    it('tests ok', async () => {
      const frame = firstValueFrom(AWAITABLE.Duration(THRESHOLD.Frame, 'frame'))
      const blink = firstValueFrom(AWAITABLE.Duration(THRESHOLD.Blink, 'blink'))
      const result = await Promise.race([frame, blink]);
      expect(result).toEqual('frame')
    })
  })
});

describe('after', () => {
  it('is an Observable', () => {
    expect(after(1, 1)).toBeInstanceOf(Observable);
  })
  it('is awaitable', async () => {
    const result = await after(1, '1.1');
    expect(result).toEqual('1.1')
  });

  describe('delay arg', () => {
    describe('when 0', () => {
      it('is synchronous', () => {
        let result;
        after(0, () => { result = 3 }).subscribe();
        expect(result).toEqual(3)
      });
    });
    describe('when a Promise', () => {
      it.todo('TODO resolves with new value')
    })
  });

  describe('value arg', () => {
    describe('when value', () => {
      it.todo('is produced after the delay');
    });
    describe('when function', () => {
      it.todo('is produced');
    });
    describe('when Observable', () => {
      it.todo('is produced');
    });
  });
});
