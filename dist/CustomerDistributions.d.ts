export declare function fillupArrayCount(a: Array<number>, total: number): Array<number>;
export declare function fillupArrayPercent(a: Array<number>): Array<number>;
declare type Disposer = () => void;
declare class MyDisposable {
    disposeCallbacks: Array<Disposer>;
    constructor();
    addDisposer(disposer: Disposer): void;
    dispose(): void;
}
export declare class EvenCustomerDistribution extends MyDisposable {
    total: number;
    controlGroupSize: number;
    mode: "percent" | "count";
    errorMessage: string | null;
    constructor(total: number);
    onModeChange(): void;
    get valid(): boolean;
}
export declare class ProportionalCustomerDistribution extends MyDisposable {
    total: number;
    controlGroupSize: number;
    controlGroupErrorMessage: string | null;
    proportions: number[];
    mode: "percent" | "count";
    errorMessage: string | null;
    proportionErrorMessages: Array<string | null>;
    highestManuallyChangedIndex: number;
    constructor(total: number, numberOfProportions: number);
    updateProportion(index: number, value: number): void;
    onModeChange(): void;
    get sumTotal(): number;
    balance(condition?: string | undefined): void;
    get valid(): boolean;
}
export {};
