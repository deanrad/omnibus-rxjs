[![Travis CI](https://api.travis-ci.com/deanrad/omnibus-rxjs.svg?token=jDxJBxYkkXVxwqfuGjmx&branch=master&status=passed)](https://travis-ci.com/deanrad/omnibus-rxjs)
![Code Coverage](https://shields.io/badge/coverage-100%25-brightgreen)
[![Maintainability](https://api.codeclimate.com/v1/badges/f7c14c5a3bbbf0d803cc/maintainability)](https://codeclimate.com/github/deanrad/omnibus-rxjs/maintainability)

# omnibus-rxjs

An Event Bus for RxJS. Ala Redux Middleware (Sagas), with no Redux dependency.

## What Is It?

A 'sugar' around an RxJS Subject, with declarative mapping of Observables.

## Build Impact?

Size: <10 Kb minified, gzipped. Tree-shakable to less.

## Architectural Reason

Enables micro-front ends because event bus listeners can be dynamically added and removed. See NextJS example (TODO create).

## Usage with React

Like XState, the Omnibus engine removes async handling from the purview of React. [Why is this a good idea?](http://TODO.org).

This makes your code future-proof in React, including needing no changes for [Suspense](https://reactjs.org) mode.

Event bus listeners can run _before_ the render cycle, vs `useEffect` which only runs **after**. This can cut off entire classes of edge cases

## Usage with RxJS

RxJS operators are brilliant and useful, but they tend to couple concepts that are separate. For example, an autocomplete, in RxJS terms is:

```js
const changeEvents = fromEvent(input, 'change'); //
const results = changeEvents().pipe(
  switchMap(({ value: query }) => getResult$(query))
);
results.subscribe(updateUI);
```

Conceptually there are two sources of events - the Observable of `changeEvents` coming from the user typing in the query input box. For each of those events, an Observable is triggered (which cancels any previous one, per the `switchMap` concurrency operator).

A better expression of this architecture can be made in terms of services and an event bus connecting them.

```js
// bus.js
// Every item on this bus will be an FSA. Useful to duck-type Redux.
export bus = new Bus<Action>();

//userService.js
import { bus } from './bus'
import { queryCreator } from './search-service'

class QueryService implements Service {
  private currentRun:Subscription
  start() {
    this.currentRun?.unsubscribe() // restarts it
    this.currentRun = fromEvent(input, 'click').subscribe(e => {
     const event = queryCreator(e.target.value)
      bus.trigger(event)
    })

  }
  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe()
  }
}

```

See [`omnibus-react`](https://github.com/deanrad/omnibus-react) for React-specific bindings.
