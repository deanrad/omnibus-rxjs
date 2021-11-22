[![Travis CI](https://api.travis-ci.com/deanrad/omnibus-rxjs.svg?token=jDxJBxYkkXVxwqfuGjmx&branch=master&status=passed)](https://travis-ci.com/deanrad/omnibus-rxjs)
![Code Coverage](https://shields.io/badge/coverage-100%25-brightgreen)
[![Maintainability](https://api.codeclimate.com/v1/badges/f7c14c5a3bbbf0d803cc/maintainability)](https://codeclimate.com/github/deanrad/omnibus-rxjs/maintainability)

# omnibus-rxjs

## What Is It?

An Event Bus for simplifying front-end code, especially in VanillaJS and React codebases. Can serve as its own framework, or an add-on, run in Node, or Deno, and maintain decoupling from frameworks, or downstream services.

## How to Get It?

`npm install omnibus-rxjs`

Deno: Coming Soon!

## How Big Is It?

Only 8Kb minified, gzipped

## What Front-End problems does it help with?

- Keep components and services testable—since they're specified only in terms of messages they send or respond to - no mocking required!
- Don't need to prop-drill, lift state, or introduce Contexts to do inter-component communication; sharing the bus is sufficient.
- Code UX to handle all edge-cases around API/service communication, by depending only on the messages. Even if those services aren't built yet!
- Keep memory footprint small, and prevent bundle bloat by allowing functionality to load/unload at runtime.

And many more - see How Can I Explain This To My Team.

## Usage with React

```ts
import { bus, CounterIncrement, useWhileMounted } from "./events/"
const CounterDisplay = () => {
  const [count, setCount] = useState(0);
  useWhileMounted(() => {
    return bus.listen(CounterIncrement.match, () => {
      setCount(c => c+1))
    })
  })
}
```

This example invokes a React state-setter each time an event matching `CounterIncrement` is trigger-ed onto the bus. `bus.listen` returns an RxJS `Subscription` object, and the wrapping of it in `useWhileMounted` allows the listener to be removed upon component unmounting.

In an entirely un-coupled component, anywhere in the app, a component (or test framework) will trigger those actions:

```ts
import { bus, CounterIncrement } from './events'
const CounterButton = () => {
  return <button onClick={() => trigger(CounterIncrement())}>
}
```

The source of `useWhileMounted`:

```ts
function useWhileMounted(subsFactory: () => Subscription) {
  useEffect(() => {
    const sub = subsFactory();
    return () => sub?.unsubscribe();
  }, []);
}
```

Note that any handlings that are in progress when the component is unmounted will be automatically canceled (if they support it by returning Observables).

Note also how the specs read for each component:

```
describe: CounterButton
  it: triggers a CounterIncrement event when clicked

describe: CounterDisplay
  it: increments its number by 1 upon a CounterIncrement event
```

And with that specification, no test-framework specific mocks need to be written - a `query` can see what CounterButton does, and a test need only `trigger` and examine the output of CounterDisplay. No complicated, nested `jest.mock` calls. Bonus: you can animate your Storybook stories by performing a series of `trigger` calls in your stories.

# Example Applications

There is [TodoMVC](). The Redux Toolkit [Async Counter]()

The [7 GUIs](https://eugenkiss.github.io/7guis/) are a series of UX challenges which range from a simple counter to a highly dynamic spreadsheet with formulae and cell references.

- [1-Counter]()
- [2-Temperature]()
- [3-Flight Booker]()
- [4-Timer]()
- [5-CRUD]()
- [6-Circles]()
- [7-Cells]()

Omnibus solutions to all the above maintain a uniform, testable architectural style. Other example apps have included IOT, Animation, WebAudio, WebSockets and many more.

# API

The Omnibus API is intentionally simple. Since it has been in use for >4 years (since 2017), its core APIs are stable.

---

> **Constructor**: `new Omnibus<EType>()`

Declares the event bus, and the (super)-type of events it can carry. When used with a library like [Redux Toolkit](), or [`typescript-fsa`](), this will be:

`export const bus = new Omnibus<Action>()`

---

> **trigger**: `bus.trigger<SubType extends EType>(event)`

Triggers an action to the event bus, so that listeners may handle it after passing all pre-processors (guards, filters, and spies). _Triggering has no performance cost if there are no listeners_.

As an example: if you have logging that should only occur in lower environments, the calls to `bus.trigger` can be left in place throughout your app and logging listeners only attached in lower environments. Compare this to actual `console.log` statements which must be removed.

No type-annotation is needed at call-time to ensure typesafety of triggered actions.

```js
// CounterIncrement returns a subtype of Action onto bus<Action>
handleClick={((e) => bus.trigger(CounterIncrement()))}
```

---

> **query**: `bus.query(predicate: (EType => boolean))`

From a testing perspective, `query` is a way to assert that a `trigger` was called.

More generally, `query` allows you to get a subset of actions of the bus as an RxJS Observable. This allows you create a 'derived stream' to detect certain conditions in time.

```ts
// Do something when 5 or more bus events occur in one second
const rateLimitViolations = bus
  .query(() => true)
  .pipe(
    bufferTime(1000),
    filter((buffer) => buffer.length >= 5)
  );
rateLimitViolations.subscribe(() => console.log('Slow down!'));
```

Race condition issues could be detected and fixed by using combinations of `query` to run a corrective action.

You can get a Promise for the result of a `query`, using RxJS' `firstValueFrom`:

```ts
import { firstValueFrom } from 'rxjs';
firstValueFrom(rateLimitViolations).then(() => console.log('Game over!'));
```

---

> **reset**: `bus.reset()`

Returns the bus to a state where there are no listeners. Any active `query` Observables will complete upon a `reset`. Any active listeners, if they were defined to return cancelable Observables (vs uncancelable Promises) will be unsubscribed, canceling their work and freeing up resources immediately.

In a Hot-Module-Reloading environment where a bus instance may get the same listeners attached multiple times, adding a call to `reset` can prevent double-listenings.

```ts
bus.reset(); // Be HMR-friendly
```

## Async Handlers

> **listen**: `bus.listen(matcher, handler, observer)`

> **listenQueueing**: `bus.listenQueueing`

> **listenSwitching**: `bus.listenSwitching`

> **listenBlocking**: `bus.listenBlocking`

Each `bus.listen` method variant takes the same function arguments (explained shortly), and returns a Subscription. This subscription can be thought of as an Actor in the Actor model.

### **Arguments**

The first two required arguments are:

- `matcher` - A predicate function. Each event of the bus is run through each listener's predicate function. If the matcher returns `true` then the bus invokes that listener's handler.
- `handler` - A function to do some work when a matching event appears on the bus. The handler recieves the event as its argument. It can perform the work:
  - Synchronously
  - Immediately, by returning a Promise
  - Deferred, by returning a Promise-returning function
  - Deferred, and cancelable by returning an Observable

The most powerful and performant of these is the Observable, whose cancelability prevents resource leaks and helps tame race conditions. **Note:** You do not need to call `subscribe()` when returning an Observable- Omnibus does that automatically on any Observable you return. When returning a Promise, there's no need to `await` it or declare the handler `async`.

```ts
// Sync
bus.listen(matcher, (e) => console.log('event: ', e));

// Immediate Promise
bus.listen(matcher, (e) => fetch(url).then((res) => res.json()));

// Deferred Promise (needed if you want to queue handlings)
bus.listen(matcher, (e) => () => fetch(url).then((res) => res.json()));

// Observable (cancelable w/o AbortController!)
bus.listen(matcher, (e) => ajax.getJSON(url));
```

### **Concurrency**

The purpose of using one `listen` variant over another - say `listenQueueing` instead of `listen`, is to specify what the listener does if it already is executing a handling, and a new event comes in. More detail below.

### **Handler Lifecycle Events**

For any individual handling, there are events of interest - such as when it starts, errors, or produces a value successfully. So, the final, optional argument in constructing a listener is `observer`— an object with any of these callbacks:

- `error(e)` - A Promise `reject` or Observable `error` occurred.
- `complete()` - A Promise `resolve` or Observable `complete` occurred.
- `next(value)` - Conveys the resolved Promise value, or an Observable `next` value.
- `subscribe()` - The deferred Promise was begun, or the Observable was subscribed to.
- `unsubscribe()` - The Observable was unsubscribed before it completed. Aborted Promises are handled as `error` instead.

If you are using the `observer` simply to trigger

### **Unregistering a Listener**

To unregister the listener, simply call `unsubscribe()` on the return value. Any work being done by a listener will be canceled when the listener's subscription is unsubscribed, or if `bus.reset()` is called.

```ts
const sub = bus.listen(when, () => work); // sets up
bus.trigger(startsWork); // begins work
sub.unsubscribe(); // ends, including work
```

---

## Pre-Processors/Sync Handlers: Guards, Filters, Spies

The bus allows for various forms of pre-processors - functions which run on every `trigger`-ed action, before any listener sees the action. These are not intended to begin any async process, but more commonly to:

- Throw an exception to the caller of `bus.trigger()` (Listeners, by design do not do this - see Error Handling)
- Validate, sign, timestamp or otherwise modify the event before any listener can see it.
- Call a state setter (as in React useState), or dispatch an action (as in useReducer)
- `console.log` or write to another log synchronously.

> **guard**: `bus.guard(matcher, handler)`

Guard functions are run in the callstack of the triggerer. Their return value is unimportant, but may throw an exception to prevent further processing.

```js
// Prevent negative increments
bus.guard(CounterIncrement.match, ({ payload: { increment = 0 } }) => {
  if (increment < 0) throw new Error('Cant go backward');
});
bus.trigger(CounterIncrement(-1)); // throws
```

A fun debugging technique is to open a debugger upon an action of your choosing, to find out where in the code it was triggered (since `grep` doesnt always find dynamic event creation):

```js
bus.guard(CounterIncrement.match, () => {
  debugger; /* i see you! */
});
```

> **filter**: `bus.filter(matcher, handler)`

If you are intending to change the contents of an event on the bus, a handler passed to `filter` is the place to do it. Either mutate the event directly in the handler, or if you prefer immutability, return a new event. This is useful to centralize functionality like timestamps, making it not the responsibility of the trigger-er.

```ts
bus.filter(CounterIncrement.match, (e) => {
  e.createdAt = Date.now()  // thus each triggerer is not bu
}
```

If an event requires further authorization, a `filter` may substitute an authenitcation event in its place:

```ts
bus.filter(CounterIncrement.match, (event) => {
  return RequestAuth({ attempted: event })
}
bus.listen(RequestAuth.match, ({payload: { attempted }}) => {
  if (window.sessionId) {
    perform(attempted)
  }
})
```

If a set of timing conditions requires that an event be disregarded by all downstream handlers, a filter can change its event to not be seen by those handlers:

```ts
// Increments will be missed by handlers matching on type
bus.filter(CounterIncrement.match, (e) => {
  if (count > 99) {
    e.type = "__ignored__" + e.type
  }
}
```

> **spy**: `bus.spy(handler)`

A spy handler runs synchronously for all runtime events, just before the listeners. The results of any `filter` is visible to any `spy`.

---

## Error Handling

### **Guards/filters/spies**

Exceptions thrown by these functions will raise to the code that called `bus.trigger`. The functions will continue to be run on future events that match, and so may throw multiple times.

### **`listen` handlers**

Exceptions, Rejected Promises, or Observable errors that occur while running a `handler` will not be visible to the code that called `bus.trigger`. This is by design, to ensure that if 3 listeners are registered for an event, all 3 of them will run, no matter if one of them throws. The intent is that you handle the error either inline in the handler, or in the `error` property of the `observer` argument. **The listener, unless it provides an `error` callback in its `observer`, will be unsubscribed on an error!** This is for the stability of the rest of the application—if you grow an app incrementally, the last thing you want is the worst-behaved 1% of features breaking the remaining, well-behaved features.

> **errors**: `bus.errors.subscribe(handler)`

---

# How Can I Explain Why We Should Use This to My Team?

The main benefits of Omnibus are:

- Allows you to architect your application logic around events of interest to your application, not around volatile framework-specific APIs.
- Provides an execution container for typesafe, leak-proof async processes with reliable concurrency options to squash race conditions and resource leaks.

To the first point - framework-specific issues like "prop-drilling" and "referential instability" disappear when an event bus transparently connect components anywhere in the tree through a single static import of a bus.

To the second - just as XState is a predictable, safe, leak-proof state-container, Omnibus is that for async processes, because it uses the core options of RxJS - Observables and concurrency operators. However, compared to 'raw' RxJS, Omnibus is considerably easier to use, especially in a React context.

With Omnibus inside React, you can:

- Keep components and services testable—since they're specified only in terms of messages they send or respond to - no mocking required!
- Don't need to prop-drill, lift state, or introduce Contexts to do inter-component communication; sharing the bus is sufficient.
- Code UX to handle all edge-cases around API/service communication, by depending only on the messages. Even if those services aren't built yet!
- Keep memory footprint small, and prevent bundle bloat by allowing functionality to load/unload at runtime.

With Omnibus over RxJS, you can:

- Compose your app one listener/handler at a time, never building a giant, unreadable chain.
- Do little-to-no management of `Subscription` objects
- Preserve readability of operator code: `concatMap` => `listenQueueing`
- Type `pipe()` and `import ... from 'rxjs/operators'` less

You can start with Omnibus with no RxJS logic at all - just handlers returning Promises. Then as you require capabilities that Observables offer—like cancelation— you can change what those handlers return. _Leaving the rest of your app unchanged!_

In short - the kinds of upgrades one must do in web development, such as migrating code from uncancelable to cancelable, from REST endpoint to Web Socket, are made easy with Omnibus. And the UX can be made tight and responsive against any downstream behavior because of its modular, decoupled nature.

# Inspirations, References

- RxJS
- Redux-Observable
- XState
