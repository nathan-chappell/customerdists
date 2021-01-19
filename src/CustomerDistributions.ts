import {
  observable,
  makeObservable,
  autorun,
  computed,
  action,
  runInAction,
  reaction,
} from "mobx";

// TODO: total must be greater than 0 or else errors are possible...

// utils

const addition = (x: number, y: number) => x + y;

type Validator = {
  validate: (x: number) => boolean;
  errorMessage: string;
};

const roundN = (x: number, n: number = 2) => Math.round(x * 10 ** n) / 10 ** n;

const convertFrom = {
  percent: (x: number, n: number) => roundN(x / n),
  count: (x: number, n: number) => roundN(x * n, 0),
};

const Validators: Record<string, Validator> = {
  isNumber: {
    validate: (x: any) => typeof x === "number",
    errorMessage: "input is not a number",
  },
  isNonNegative: {
    validate: (x: number) => x >= 0,
    errorMessage: "input must be greater than 0",
  },
  isInt: {
    validate: (x: number) => Math.floor(x) === x,
    errorMessage: "input must be an integer",
  },
};

const lessThan: (bound: number) => Validator = (bound) => ({
  validate: (x: number) => x <= bound,
  errorMessage: `input must be less than ${bound}`,
});

const equalTo: (val: number) => Validator = (val) => ({
  validate: (x: number) => x === val,
  errorMessage: `input must be equal to ${val}`,
});

function runValidation(
  val: number,
  validators: Array<Validator>
): null | string {
  for (let validator of validators) {
    if (!validator.validate(val)) {
      return validator.errorMessage;
    }
  }
  return null;
}

/*
 * Multiply everything by 100 and floor to deal with Count and Percentage in a
 * uniform way.
 */
export function fillupArrayCount(
  a: Array<number>,
  total: number
): Array<number> {
  const sum = a.reduce(addition);
  const delta = total - sum;
  const div = Math.floor(delta / a.length);
  const mod = delta % a.length;
  const getIndexInc = (i: number) => div + (a.length - i <= mod ? 1 : 0);
  console.log(a, total, sum, delta, div, mod);
  // return a.map((x: number, i: number) => (x + getIndexInc(i)) / 100);
  return a.map((x: number, i: number) => x + getIndexInc(i));
}

export function fillupArrayPercent(a: Array<number>): Array<number> {
  return fillupArrayCount(
    a.map((x) => Math.floor(x * 100)),
    100 * 100
  ).map((x) => x / 100);
}

function fillupArray(
  a: Array<number>,
  total: number,
  mode: "count" | "percent"
): Array<number> {
  switch (mode) {
    case "count":
      return fillupArrayCount(a, total);
    case "percent":
      return fillupArrayPercent(a);
    default:
      console.error(`Invalid mode for fillupArray: ${mode}`);
      return a;
  }
}

// base class for disposing

type Disposer = () => void;

class MyDisposable {
  disposeCallbacks: Array<Disposer>;
  constructor() {
    this.disposeCallbacks = [];
  }
  addDisposer(disposer: Disposer): void {
    this.disposeCallbacks.push(disposer);
  }
  dispose(): void {
    this.disposeCallbacks.forEach((cb) => cb());
  }
}

const validateMode = (mode: string) => {
  if (!["percent", "count"].includes(mode)) {
    console.error(`Invalid mode set: ${mode}`);
  }
};

export class EvenCustomerDistribution extends MyDisposable {
  total: number;
  controlGroupSize: number = 0; // number > 0 (int or float depending on mode)
  mode: "percent" | "count" = "count"; // 'percent' | 'count'
  errorMessage: string | null = null; // string | null, null iff no error condition

  constructor(total: number) {
    super();
    this.total = total;
    makeObservable(this, {
      controlGroupSize: observable,
      mode: observable,
      errorMessage: observable,
      onModeChange: action,
      valid: computed,
    });
    // I don't know why autorun wouldn't work here...
    this.addDisposer(
      reaction(
        () => this.mode,
        (mode) => this.onModeChange()
      )
    );
    this.addDisposer(autorun(() => validateMode(this.mode)));
  }

  onModeChange(): void {
    const converter = convertFrom[this.mode];
    if (typeof converter !== "function") {
      console.error(`error: can't get convertFrom[${this.mode}]`);
    } else {
      this.controlGroupSize = convertFrom[this.mode](
        this.controlGroupSize,
        this.total
      );
    }
  }

  get valid(): boolean {
    const validators: Array<Validator> = [
      Validators.isNumber,
      Validators.isNonNegative,
    ];
    if (this.mode === "count") {
      validators.push(Validators.isInt);
      validators.push(lessThan(this.total));
    } else {
      validators.push(lessThan(100));
    }
    // null ==> no error
    const validationError = runValidation(this.controlGroupSize, validators);
    runInAction(() => {
      this.errorMessage = validationError;
    });
    return validationError === null;
  }
}

const initialProportions = (total: number, numberOfProportions: number) =>
  [...Array(numberOfProportions)].map((_: any, i: number) =>
    i === 0 ? total : 0
  );

const initialProportionsErrorMessages = (numberOfProportions: number) =>
  [...Array(numberOfProportions)].map(() => null);

export class ProportionalCustomerDistribution extends MyDisposable {
  total: number;
  controlGroupSize: number = 0; // number > 0 (int or float depending on mode)
  controlGroupErrorMessage: string | null = null; // number > 0 (int or float depending on mode)
  proportions: number[];
  mode: "percent" | "count" = "count"; // 'percent' | 'count'
  errorMessage: string | null = null; // string | null, null iff no error condition
  proportionErrorMessages: Array<string | null>; // ditto
  highestManuallyChangedIndex: number = -1;

  constructor(total: number, numberOfProportions: number) {
    super();
    this.total = total;
    this.proportions = initialProportions(total, numberOfProportions);
    this.proportionErrorMessages = initialProportionsErrorMessages(
      numberOfProportions
    );
    makeObservable(this, {
      controlGroupSize: observable,
      proportions: observable,
      mode: observable,
      errorMessage: observable,
      proportionErrorMessages: observable,
      onModeChange: action,
      balance: action,
      updateProportion: action,
      valid: computed,
      sumTotal: computed,
    });
    // "balance data" is just whatever should activate a call to "balance"
    const getBalanceData = () => ({
      controlGroupSize: this.controlGroupSize,
      proportions: [...this.proportions],
    });
    this.addDisposer(reaction(getBalanceData, () => this.balance()));
    this.addDisposer(
      reaction(
        () => this.mode,
        () => this.onModeChange()
      )
    );
    this.addDisposer(autorun(() => validateMode(this.mode)));
  }

  updateProportion(index: number, value: number): void {
    this.highestManuallyChangedIndex = Math.max(
      index,
      this.highestManuallyChangedIndex
    );
    this.proportions[index] = value;
  }

  onModeChange(): void {
    const converter = convertFrom[this.mode];
    if (typeof converter !== "function") {
      console.error(`error: can't get convertFrom[${this.mode}]`);
    } else {
      this.controlGroupSize = converter(this.controlGroupSize, this.total);
      this.proportions.forEach((x: number, i: number) => {
        this.proportions[i] = converter(x, this.total);
      });
    }
    this.balance('fromConversion');
  }

  get sumTotal(): number {
    return this.proportions.reduce(addition, this.controlGroupSize);
  }

  /*
   * This has two purposes:
   * 1) put the next amount in the following cell as desired
   * 2) compensate for discrepancies when converting to/ from percentage
   */
  balance(condition: string | undefined = undefined): void {
    const total: number = this.mode === "count" ? this.total : 100; /* 100% */
    if (condition === 'fromConversion') {
      runInAction(() => {
        [...this.proportions] = fillupArray(this.proportions, total, this.mode);
      });
    } else if (
      this.sumTotal < total &&
      this.highestManuallyChangedIndex < this.proportions.length - 1
    ) {
      // dump whatevers remains into next available proportion
      const v = this.proportions[this.highestManuallyChangedIndex + 1];
      runInAction(() => {
        this.proportions[this.highestManuallyChangedIndex + 1] =
          Math.min(total, v + total - this.sumTotal);
      });
    } else if (
      this.sumTotal > total &&
      this.highestManuallyChangedIndex < this.proportions.length - 1
    ) {
      runInAction(() => {
        const v = this.proportions[this.highestManuallyChangedIndex + 1];
        this.proportions[this.highestManuallyChangedIndex + 1] =
          Math.max(0, v + total - this.sumTotal);
      });
    }
  }

  get valid(): boolean {
    //
    // validator setup
    const validators: Array<Validator> = [
      Validators.isNumber,
      Validators.isNonNegative,
    ];
    let globalValidators: Array<Validator> = [];
    let expectedSum: number;
    if (this.mode === "count") {
      validators.push(Validators.isInt);
      globalValidators.push(equalTo(this.total));
    } else {
      globalValidators.push(equalTo(100));
    }
    let validationErrors: Array<string | null> = [];
    const lastValidationError = () =>
      validationErrors[validationErrors.length - 1];
    //
    // validation logic
    // control group validation
    validationErrors.push(runValidation(this.controlGroupSize, validators));
    runInAction(() => {
      this.controlGroupErrorMessage = lastValidationError();
    });
    // proportions validation
    for (let i = 0; i < this.proportions.length; i += 1) {
      validationErrors.push(runValidation(this.proportions[i], validators));
      runInAction(() => {
        this.proportionErrorMessages[i] = lastValidationError();
      });
    }
    // global validation
    validationErrors.push(runValidation(this.sumTotal, globalValidators));
    runInAction(() => {
      this.errorMessage = lastValidationError();
    });
    return validationErrors.every((x) => x === null);
  }
}
