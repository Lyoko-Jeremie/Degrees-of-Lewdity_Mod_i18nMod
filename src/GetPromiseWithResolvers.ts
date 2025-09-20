// from: typescript/lib/lib.es2024.promise.d.ts
export interface PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

type withResolversCaller = <T>() => PromiseWithResolvers<T>;

// from: typescript/lib/lib.es2024.promise.d.ts
// interface PromiseConstructor {
//     /**
//      * Creates a new Promise and returns it in an object, along with its resolve and reject functions.
//      * @returns An object with the properties `promise`, `resolve`, and `reject`.
//      *
//      * ```ts
//      * const { promise, resolve, reject } = Promise.withResolvers<T>();
//      * ```
//      */
//     withResolvers<T>(): PromiseWithResolvers<T>;
// }

class Defer<T> implements PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve!: (value: T | PromiseLike<T>) => void;
    reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<T>((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}

export function GetPromiseWithResolvers<T>(): PromiseWithResolvers<T> {
    if ('withResolvers' in Promise) {
        return ((Promise as any)['withResolvers'] as withResolversCaller)<T>() as PromiseWithResolvers<T>;
    }
    return new Defer<T>();
}
