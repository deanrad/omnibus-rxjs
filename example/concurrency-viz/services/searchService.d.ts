import { Omnibus } from '../../src/bus';
export interface SearchRequest {
    query: string;
    id?: number;
}
export interface SearchLoading {
    request?: {
        id: number;
    };
}
export interface SearchComplete {
    request?: {
        id: number;
    };
    result: [string];
}
export interface SearchError extends Error {
    request?: {
        id: number;
    };
}
export interface SearchResult {
    result: string;
    request?: {
        id: number;
    };
}
export interface SearchCanceled {
    request?: {
        id: number;
    };
}
export declare const searchRequestCreator: import("typescript-fsa").ActionCreator<SearchRequest>;
export declare const loadingCreator: import("typescript-fsa").ActionCreator<SearchLoading>;
export declare const resultCreator: import("typescript-fsa").ActionCreator<SearchResult>;
export declare const errorCreator: import("typescript-fsa").ActionCreator<SearchError>;
export declare const completeCreator: import("typescript-fsa").ActionCreator<SearchComplete>;
export declare const cancelCreator: import("typescript-fsa").ActionCreator<SearchCanceled>;
export declare function getResult$(action: ReturnType<typeof searchRequestCreator>): import("rxjs").Observable<import("typescript-fsa").Action<SearchResult>>;
export declare class SearchService {
    bus: Omnibus<any>;
    private currentRun;
    constructor(bus: Omnibus<any>);
    start(): void;
    stop(): void;
}
