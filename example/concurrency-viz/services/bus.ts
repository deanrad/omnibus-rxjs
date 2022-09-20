import { Action } from 'typescript-fsa';
import { Omnibus } from '../../../src/bus';
export { Omnibus } from '../../../src/bus';
// Defines our bus and its types
export const bus = new Omnibus<Action<any>>();
bus.guard(
  (e) => !e.type.startsWith('ani'),
  (e) => console.log(e.type, e.payload)
);

window.bus = bus;
