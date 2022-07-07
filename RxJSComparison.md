# ServiceSubject: An opinionated RxJS container

RxJS is a wonderful tool for asynchronous effect management that affords several key benefits such as:

- Declarative Concurrency
- Declarative Cancelation

But its API can be unwieldly, resulting in a steep learning curve, and difficulty in knowledge-sharing across a team. The following are RxJS learning pain points experienced by many developers:

- Composition via `pipe()` vs `async/await`
- Operator Choice
- Subscription Management
- Error-Handling

The `ServiceSubject` addresses these pain points by:

- Not requiring `pipe()` and operator `import`s for the most common cases
- Having factories like `ServiceSubjectQueueing` to defined a `ServiceSubject` that will use a `concatMap` operator, etc..
- By allowing cancelation via a `Subscription` object, but for most cases not needing to store a reference to a `Subscription` at all.

---

## Composition via `pipe()` 

When you create a service subject, you create it with a `namespace` and a `handler`. An RxJS `Subject` is created, and the `handler` is subscribed to it with a concurrency operator.

Without `ServiceSubject`
```js
import { Subject } from 'rxjs'
import { concatMap } from 'rxjs/operators'
```

Using `ServiceSubject`
```js
import { ServiceSubject } from 'omnibus-rxjs'
import { of } from 'rxjs'

// Arguments: namespace, handler, reducer-factory
const counter = new ServiceSubject(
  'counter',  
  (inc) => of(inc), // a synchronous handler
  () => (count=0, increment=1) => (count + increment)
)
counter.listen(
  counter.actions.next,
  ({ payload: inc=1 }) => console.log(`Next increase: ${inc}`)
)

counter.state.subscribe({ 
  next(count){ console.log(`The new count is: `)}
}})
counter.next()
// Next increase: 1
// The new count is: 1
counter.next(2)
// Next increase: 2
// The new count is: 3
```


## Error Handling

RxJS Error Handling is not as straightforward as with Promises. Since RxJS _can_ be synchronous, both sync and async exceptions must be dealt with. This is what has been referred to as as the "Red-or-Blue Function" dilemma in ["What Color Is Your Function" ](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/) by Bob Nystrom.

For RxJS synchronous errors, if a call to `subscribe()` throws an error synchronously, the entire host process is killed as though the Subscription's exception is a process-level one. 

For RxJS asynchronous errors, an asynchronous, and untrappable exception occurs if the `Observer` of the `Subscription` doesn't provide an `error()` callback.

Wouldn't it be nice to have an alternate method of handling `Observable` errors that is more consistent, and flexible?


```js
const syncCount = createServiceSubject('counter', () => after(10, throwError('oops')))
const asyncCount = createService('counter', () => { throw new Error('oops')})

// Specify how to handle exceptions with a listener for an error event
const errHandler = asyncCount.listen(
  'counter/error', 
   (e) => console.error(e)
) as Subscription;

// synchronously throws
syncCount.next()

// errHandler
asyncCount.next()
```


```
./node_modules/rxjs/dist/cjs/internal/util/reportUnhandledError.js:13
            throw err;
```


**ServiceSubject** - an event of type NAME/error is emitted. The subject continues, and other listeners keep listening.

---
## Appendix 
### Subject#closed

RxJS Subject has `.closed` always `false`. It doesn't even change to `true` after calling `.complete()` or `.error()` on it, like `isStopped`.  Note - `.closed` goes `true` with `Subject.unsubscribe()`

https://twitter.com/BenLesh/status/1541068496326508545?s=20&t=wXwWoJZktc1nGv8vRzDDGA
