import { Subscription, fromEvent } from 'rxjs';
import { Omnibus } from './bus';
import { searchRequestCreator } from './searchService';

// As long as there is one instance of UserService running,
// each user-triggered 'change' event on the #search input element
// will become an event on the bus that the searchService knows how to listen to.
export class UserService {
  private currentRun: Subscription;
  private requestId = 0;
  constructor(public bus: Omnibus<any>) {}
  start() {
    const input = document.getElementById('search');
    debugger
    this.currentRun = fromEvent<InputEvent>(input, 'change').subscribe({
      next: (e) => {
        const event = searchRequestCreator({
          query: 'foo',
          id: this.requestId++,
        });
        this.bus.trigger(event);
      },
    });
  }
  // Stop is barely needed because start() returns the means to stop(), as RxJS Subscriptions do.
  stop() {
    this.currentRun?.unsubscribe();
  }
}
