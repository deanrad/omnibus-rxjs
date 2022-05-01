import { ActionCreator, actionCreatorFactory } from 'typescript-fsa';

class Builder<T> {
  _actions = {};

  addOption<V>(name: string): Builder<T & {[name]: ActionCreator<V>}> {
    // do your stuff

    return this as Builder<T | V>;
  }

  setDefault(v: T): this {
    // do your stuff

    return this;
  }

  build(): T[] {
    // return list of all options ??
  }
}

function optionBuilder(): Builder<never> {
  return new Builder();
}

const o1 = optionBuilder().addOption<number>('a1');

const actions = o1.build();
// export function createActions(namespace: string) {
//   const createAction = actionCreatorFactory(namespace);

//   let _actions = {};

//   const builder = function <T>(name: string) {
//     let ac = createAction<T>(name);
//     return { _actions, [name]: ac } as typeof _actions;
//   };

//   return { add: builder };
// }

// const actions = createActions('ns').add<number>('a1'); //.end();

console.log(actions.a1());
