import { Omnibus } from './bus';
import { actionCreatorFactory, Action } from 'typescript-fsa';
type BusItemType<T> = Action<T>
const FSAEvent = actionCreatorFactory()

describe('Bus', () => {
  it('can be instantiated', () => {
    const bus = new Omnibus<BusItemType<string>>();
    expect(bus).toBeTruthy();
  });
});
