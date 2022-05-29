import { from, ObservableInput } from 'rxjs';
import { Action } from 'typescript-fsa';
import { Omnibus } from '../../src/bus';
import { isType } from '../../src/utils';
import { toggleMap } from '../../src/toggleMap';
import { after } from '../../src/after';

const tree = generateDataTree(
  `# 0. React Problems Solved via an Event Bus
# 1. Performance
## 1.1 Resource Leaks
### 1.1.1 fetch persists for unmounted components
## 1.2 Can't update unmounted component errors
## 1.3 Streaming		
`
);

interface Node {
  children: Node[];
  text: string;
}

describe('Search - can switch between DFS and BFS with just a one-line diff!', () => {
  let seen = [];
  beforeEach(() => {
    seen = [];
  });

  describe('Depth First', () => {
    it('can be done with immediate listening (or guards)', () => {
      const bus = new Omnibus<Action<any | undefined>>();
      setupBus(bus);

      // THE MAGIC - use .listen to
      // Immediately and recursively descending into children in this callstack
      bus.listen(...predicateAndHandler, bus.observeAll());

      // kick it off
      bus.trigger({ type: 'search', payload: {} });

      expect(seen.join('\n')).toEqual(`
 0. React Problems Solved via an Event Bus
 1. Performance
 1.1 Resource Leaks
 1.1.1 fetch persists for unmounted components
 1.2 Can't update unmounted component errors
 1.3 Streaming`);
    });
  });

  describe('Breadth First', () => {
    it('can be done with a queueing listener', () => {
      const bus = new Omnibus<Action<any | undefined>>();
      setupBus(bus);

      // THE MAGIC - use .listenQueueing to
      // Form a queue of recursive descents into children
      bus.listenQueueing(...predicateAndHandler, bus.observeAll());

      // kick it off
      bus.trigger({ type: 'search', payload: {} });

      expect(seen.join('\n')).toEqual(`
 0. React Problems Solved via an Event Bus
 1. Performance
 1.1 Resource Leaks
 1.2 Can't update unmounted component errors
 1.3 Streaming
 1.1.1 fetch persists for unmounted components`);
    });
  });

  // lesser used modes
  describe('Switching', () => {
    it('can be done with a switching listener', () => {
      const bus = new Omnibus<Action<any | undefined>>();
      setupBus(bus);

      bus.listenSwitching(...predicateAndHandler, bus.observeAll());

      // kick it off
      bus.trigger({ type: 'search', payload: {} });

      expect(seen.join('\n')).toEqual(`
 0. React Problems Solved via an Event Bus
 1. Performance
 1.1 Resource Leaks
 1.1.1 fetch persists for unmounted components`);
    });
  });

  describe('Blocking', () => {
    it('can be done with a blocking listener', () => {
      const bus = new Omnibus<Action<any | undefined>>();
      setupBus(bus);

      bus.listenBlocking(
        isType('node'),
        ({ payload: node }) => {
          // An Observable of node events for each child
          // Note: delayed by a tick, so it can actually block
          return after(
            Promise.resolve(),
            from(
              node.children.map((child) => ({ type: 'node', payload: child }))
            )
          );
        },
        bus.observeAll()
      );

      // kick it off
      bus.trigger({ type: 'search', payload: {} });

      expect(seen.join('\n')).toEqual(`
 0. React Problems Solved via an Event Bus
 1. Performance`);
    });
  });

  function setupBus(bus: Omnibus<Action<any>>) {
    // capture nodes in the order they are triggered
    bus.spy(({ payload: node }) => seen.push((node.text as string)?.trimEnd()));

    // upon a 'search' event, trigger 'node' events for each top-level node of the tree
    bus.listen<Node>(
      isType('search'),
      () => from(tree),
      bus.observeWith({
        next(node) {
          return { type: 'node', payload: node };
        },
      })
    );
  }

  // shared between DFS and BFS!!
  const predicateAndHandler: [
    (a: Action<any>) => boolean,
    (a: Action<Node>) => ObservableInput<Action<Node>>
  ] = [
    isType('node'),
    ({ payload: node }) => {
      // An Observable of node events for each child
      return from(
        node.children.map((child) => ({ type: 'node', payload: child }))
      );
    },
  ];
});

// Turns our text-based tree into an object-based tree
function generateDataTree(text): Node[] {
  const array = text.split('\n');

  const objectArr = array.map((item, i) => {
    const level = item.match(/#/g)?.length;
    const text = item.replace(/#/g, '');
    return { text, level, id: i, children: [] };
  });

  let tree = [];
  for (let i = 0; i < objectArr.length; i++) {
    if (objectArr[i].level === 1) tree.push(objectArr[i]);

    for (let j = i - 1; j >= 0; j--) {
      if (objectArr[j].level < objectArr[i].level) {
        objectArr[j].children.push(objectArr[i]);
        break;
      }
    }
  }

  return tree;
}
