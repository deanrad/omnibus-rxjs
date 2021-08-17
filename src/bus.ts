import { Subject } from 'rxjs';

export class Omnibus<T> {
    private channel: Subject<T>;

    constructor() {
        this.channel = new Subject();
    }
}