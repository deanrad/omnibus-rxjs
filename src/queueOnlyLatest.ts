// @ts-nocheck
import { Observable, ObservableInput, Subject, Subscription } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { after } from './after';

interface Spawner {
  (event: any): Observable<any>;
}

/**
 * @param spawner The Observable-factory whose latest subscription is to be enqueued
 * @param mapper A function to combine each emission of the togglable with the trigger itself, making it the new value of the togglable.
 * @example ```
 * ```
 */
export const queueOnlyLatest: typeof mergeMap = (
  spawner: Spawner,
  mapper = (_: any, inner: any) => inner
) => {
  return function (source: Observable<any>) {
    return new Observable((notify) => {
      let innerSub: Subscription;
      let innerSubComplete: Promise<void>;
      let nextWork: ObservableInput;

      // push our work at this subject, it'll keep/exec only the latest (switchMap)
      let nextSubMgr = new Subject<Observable<any>>();
      let nextSubMgrSub = nextSubMgr.pipe(switchMap((o) => o)).subscribe();

      function runInner(trigger, work: Observable) {
        innerSubComplete = new Promise((resolve, reject) => {
          innerSub = work.subscribe({
            next: (inner) => notify.next(mapper(trigger, inner)),
            error: (e) => {
              reject(e);
              notify.error(e);
            },
            complete: resolve,
          });
          innerSubComplete;
        });
      }

      return source
        .subscribe({
          next(trigger) {
            nextWork = spawner(trigger);

            if (!innerSub || innerSub.closed) {
              runInner(trigger, nextWork);
            } else {
              innerSubComplete.then(() => {
                // XXX Promise.resolve hack prevents nested calls
                nextSubMgr.next(
                  after(Promise.resolve(), () => runInner(trigger, nextWork))
                );
              });
            }
          },
          error(e) {
            notify.error(e);
          },
          complete() {
            notify.complete();
          },
        })
        .add(() => nextSubMgrSub.unsubscribe());
    });
  };
};
