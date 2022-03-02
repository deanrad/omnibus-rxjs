import {
  asapScheduler,
  firstValueFrom,
  from,
  materialize,
  merge,
  of,
  toArray,
} from 'rxjs';
import { after } from '../src';
import {
  AWAITABLE,
  DURATION,
  THRESHOLD,
  observableFromPromisedArray,
  observeArray
} from '../src/utils';
import { TestObservable } from './bus.spec';

describe('TestDurations', () => {
  it('Sync', () => {
    const subject = DURATION.Sync(1);
    expect(subject).toEqual(1);
  });

  it('Promise', async () => {
    const subject = DURATION.Promise('x');
    expect(subject).not.toEqual('x');
    expect(subject).toBeInstanceOf(Promise);
    const result = await subject;
    expect(result).toEqual('x');
  });

  it('Timeout', async () => {
    let result;
    const subject = DURATION.Timeout('x').then((x) => {
      result = x;
    });
    expect(subject).not.toEqual('x');
    expect(subject).toBeInstanceOf(Promise);
    await Promise.resolve();
    expect(result).not.toEqual('x');
    await subject;
    expect(result).toEqual('x');
  });
});

describe('TestObservbles', () => {
  it('VC - a synchronous value and completion', () => {
    let result: any = -1;
    const events = TestObservable('VC').pipe(materialize(), toArray());
    events.subscribe((e: any) => {
      result = e;
    });
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
    const ticks = of('t0');
    const subject = merge(TestObservable('tVC'), ticks);
    let events;
    subject.pipe(materialize(), toArray()).subscribe((all) => {
      events = all;
    });

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
    const ticks = of('t0');
    const subject = merge(TestObservable('tE'), ticks);
    let events;
    subject.pipe(materialize(), toArray()).subscribe((all) => {
      events = all;
    });

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
    const subject = merge(TestObservable('TVC'), ticks);
    let events;
    subject.pipe(materialize(), toArray()).subscribe((all) => {
      events = all;
    });

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
    const subject = TestObservable('VVC');
    let events;
    subject.pipe(materialize(), toArray()).subscribe((all: any) => {
      events = all;
    });

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
      const frame = firstValueFrom(
        AWAITABLE.Duration(THRESHOLD.Frame, 'frame')
      );
      const blink = firstValueFrom(
        AWAITABLE.Duration(THRESHOLD.Blink, 'blink')
      );
      const result = await Promise.race([frame, blink]);
      expect(result).toEqual('frame');
    });
  });
});

describe('observableFromPromisedArray', () => {
  it('flattens a Promise for an array to an Observable of its items', async () => {
    const _items = ['1', '2', '3'];
    const items = observableFromPromisedArray(Promise.resolve(_items));
    const seen: typeof _items = [];
    const sub = items.subscribe((i) => seen.push(i));
    expect(seen).toEqual([]);

    await Promise.resolve();

    expect(seen).toEqual(_items);
    expect(sub).toHaveProperty('closed', true);
  });
});

describe('observeArray', () => {
  it('flattens a Promise for an array to an Observable of its items', async () => {
    const _items = ['1', '2', '3'];
    const items = observeArray(() => Promise.resolve(_items));

    const seen: typeof _items = [];
    await new Promise<void>(resolve => {
      items.subscribe({
        next: (i) => {
          seen.push(i)
        },
        complete: () => {
          resolve()
        }
      })
    })

    expect(seen).toEqual(_items);
  });

  it('flattens a Promise for an array to an Observable of its items, after a delay', async () => {
    const DELAY = 10;
    const _items = ['1', '2', '3'];
    const items = observeArray(() => Promise.resolve(_items), DELAY);

    const seen: typeof _items = [];
    const done = new Promise<void>(resolve => {
      items.subscribe({
        next: (i) => {
          seen.push(i)
        },
        complete: () => {
          resolve()
        }
      })
    })

    expect(seen).toEqual([]);
    await after(DELAY)
    expect(seen).toEqual(_items);
  });
});
