import { Omnibus } from './bus';
import { Action } from 'typescript-fsa';
type BusItemType<T> = Action<T>;

describe('Bus', () => {
  it('can be instantiated with the BusItemType it will accept', () => {
    const bus = new Omnibus<BusItemType<string>>();
    expect(bus).toBeTruthy();
  });
});
