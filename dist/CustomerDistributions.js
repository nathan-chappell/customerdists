import { observable, makeObservable, autorun, computed, action, runInAction, reaction } from "mobx"; // TODO: total must be greater than 0 or else errors are possible...
// utils

const addition = (x, y) => x + y;

const roundN = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;

const convertFrom = {
  percent: (x, n) => roundN(x / n),
  count: (x, n) => roundN(x * n, 0)
};
const Validators = {
  isNumber: {
    validate: x => typeof x === "number",
    errorMessage: "input is not a number"
  },
  isNonNegative: {
    validate: x => x >= 0,
    errorMessage: "input must be greater than 0"
  },
  isInt: {
    validate: x => Math.floor(x) === x,
    errorMessage: "input must be an integer"
  }
};

const lessThan = bound => ({
  validate: x => x <= bound,
  errorMessage: `input must be less than ${bound}`
});

const equalTo = val => ({
  validate: x => x === val,
  errorMessage: `input must be equal to ${val}`
});

function runValidation(val, validators) {
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


export function fillupArrayCount(a, total) {
  const sum = a.reduce(addition);
  const delta = total - sum;
  const div = Math.floor(delta / a.length);
  const mod = delta % a.length;

  const getIndexInc = i => div + (a.length - i <= mod ? 1 : 0);

  console.log(a, total, sum, delta, div, mod); // return a.map((x: number, i: number) => (x + getIndexInc(i)) / 100);

  return a.map((x, i) => x + getIndexInc(i));
}
export function fillupArrayPercent(a) {
  return fillupArrayCount(a.map(x => Math.floor(x * 100)), 100 * 100).map(x => x / 100);
}

function fillupArray(a, total, mode) {
  switch (mode) {
    case "count":
      return fillupArrayCount(a, total);

    case "percent":
      return fillupArrayPercent(a);

    default:
      console.error(`Invalid mode for fillupArray: ${mode}`);
      return a;
  }
} // base class for disposing


class MyDisposable {
  constructor() {
    this.disposeCallbacks = [];
  }

  addDisposer(disposer) {
    this.disposeCallbacks.push(disposer);
  }

  dispose() {
    this.disposeCallbacks.forEach(cb => cb());
  }

}

const validateMode = mode => {
  if (!["percent", "count"].includes(mode)) {
    console.error(`Invalid mode set: ${mode}`);
  }
};

export class EvenCustomerDistribution extends MyDisposable {
  controlGroupSize = 0; // number > 0 (int or float depending on mode)

  mode = "count"; // 'percent' | 'count'

  errorMessage = null; // string | null, null iff no error condition

  constructor(total) {
    super();
    this.total = total;
    makeObservable(this, {
      controlGroupSize: observable,
      mode: observable,
      errorMessage: observable,
      onModeChange: action,
      valid: computed
    }); // I don't know why autorun wouldn't work here...

    this.addDisposer(reaction(() => this.mode, mode => this.onModeChange()));
    this.addDisposer(autorun(() => validateMode(this.mode)));
  }

  onModeChange() {
    const converter = convertFrom[this.mode];

    if (typeof converter !== "function") {
      console.error(`error: can't get convertFrom[${this.mode}]`);
    } else {
      this.controlGroupSize = convertFrom[this.mode](this.controlGroupSize, this.total);
    }
  }

  get valid() {
    const validators = [Validators.isNumber, Validators.isNonNegative];

    if (this.mode === "count") {
      validators.push(Validators.isInt);
      validators.push(lessThan(this.total));
    } else {
      validators.push(lessThan(100));
    } // null ==> no error


    const validationError = runValidation(this.controlGroupSize, validators);
    runInAction(() => {
      this.errorMessage = validationError;
    });
    return validationError === null;
  }

}

const initialProportions = (total, numberOfProportions) => [...Array(numberOfProportions)].map((_, i) => i === 0 ? total : 0);

const initialProportionsErrorMessages = numberOfProportions => [...Array(numberOfProportions)].map(() => null);

export class ProportionalCustomerDistribution extends MyDisposable {
  controlGroupSize = 0; // number > 0 (int or float depending on mode)

  controlGroupErrorMessage = null; // number > 0 (int or float depending on mode)

  mode = "count"; // 'percent' | 'count'

  errorMessage = null; // string | null, null iff no error condition

  // ditto
  highestManuallyChangedIndex = -1;

  constructor(total, numberOfProportions) {
    super();
    this.total = total;
    this.proportions = initialProportions(total, numberOfProportions);
    this.proportionErrorMessages = initialProportionsErrorMessages(numberOfProportions);
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
      sumTotal: computed
    }); // "balance data" is just whatever should activate a call to "balance"

    const getBalanceData = () => ({
      controlGroupSize: this.controlGroupSize,
      proportions: [...this.proportions]
    });

    this.addDisposer(reaction(getBalanceData, () => this.balance()));
    this.addDisposer(reaction(() => this.mode, () => this.onModeChange()));
    this.addDisposer(autorun(() => validateMode(this.mode)));
  }

  updateProportion(index, value) {
    this.highestManuallyChangedIndex = Math.max(index, this.highestManuallyChangedIndex);
    this.proportions[index] = value;
  }

  onModeChange() {
    const converter = convertFrom[this.mode];

    if (typeof converter !== "function") {
      console.error(`error: can't get convertFrom[${this.mode}]`);
    } else {
      this.controlGroupSize = converter(this.controlGroupSize, this.total);
      this.proportions.forEach((x, i) => {
        this.proportions[i] = converter(x, this.total);
      });
    }

    this.balance('fromConversion');
  }

  get sumTotal() {
    return this.proportions.reduce(addition, this.controlGroupSize);
  }
  /*
   * This has two purposes:
   * 1) put the next amount in the following cell as desired
   * 2) compensate for discrepancies when converting to/ from percentage
   */


  balance(condition = undefined) {
    const total = this.mode === "count" ? this.total : 100;
    /* 100% */

    if (condition === 'fromConversion') {
      runInAction(() => {
        [...this.proportions] = fillupArray(this.proportions, total, this.mode);
      });
    } else if (this.sumTotal < total && this.highestManuallyChangedIndex < this.proportions.length - 1) {
      // dump whatevers remains into next available proportion
      const v = this.proportions[this.highestManuallyChangedIndex + 1];
      runInAction(() => {
        this.proportions[this.highestManuallyChangedIndex + 1] = Math.min(total, v + total - this.sumTotal);
      });
    } else if (this.sumTotal > total && this.highestManuallyChangedIndex < this.proportions.length - 1) {
      runInAction(() => {
        const v = this.proportions[this.highestManuallyChangedIndex + 1];
        this.proportions[this.highestManuallyChangedIndex + 1] = Math.max(0, v + total - this.sumTotal);
      });
    }
  }

  get valid() {
    //
    // validator setup
    const validators = [Validators.isNumber, Validators.isNonNegative];
    let globalValidators = [];
    let expectedSum;

    if (this.mode === "count") {
      validators.push(Validators.isInt);
      globalValidators.push(equalTo(this.total));
    } else {
      globalValidators.push(equalTo(100));
    }

    let validationErrors = [];

    const lastValidationError = () => validationErrors[validationErrors.length - 1]; //
    // validation logic
    // control group validation


    validationErrors.push(runValidation(this.controlGroupSize, validators));
    runInAction(() => {
      this.controlGroupErrorMessage = lastValidationError();
    }); // proportions validation

    for (let i = 0; i < this.proportions.length; i += 1) {
      validationErrors.push(runValidation(this.proportions[i], validators));
      runInAction(() => {
        this.proportionErrorMessages[i] = lastValidationError();
      });
    } // global validation


    validationErrors.push(runValidation(this.sumTotal, globalValidators));
    runInAction(() => {
      this.errorMessage = lastValidationError();
    });
    return validationErrors.every(x => x === null);
  }

}
