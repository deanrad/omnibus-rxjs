import { bus } from './bus';
import { SearchService } from './searchService';
import { UserService } from './userService';

// enable logging
window.addEventListener('DOMContentLoaded', () => {
  bus.reset();
  bus
    .query(() => true)
    .subscribe((i) => console.log(`trace: ${i.type}`, i.payload));

  const searchService = new SearchService(bus);
  const userService = new UserService(bus);

  searchService.start();
  userService.start();

  bus.trigger({ type: '_start', payload: undefined });
});
