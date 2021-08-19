import { bus } from './bus';
import { SearchService } from './searchService';
import { UserService } from './userService';

// enable logging
window.addEventListener('DOMContentLoaded', (event) => {
  bus
    .query(() => true)
    .subscribe((i) => console.log(`trace: ${i.type}`, i.payload));
  bus.trigger({ type: '_start', payload: undefined });

  const searchService = new SearchService(bus);
  const userService = new UserService(bus);

  searchService.start();
  userService.start();
});
