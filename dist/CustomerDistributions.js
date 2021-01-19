"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProportionalCustomerDistribution = exports.EvenCustomerDistribution = exports.fillupArrayPercent = exports.fillupArrayCount = void 0;
var mobx_1 = require("mobx");
var addition = function (x, y) { return x + y; };
var roundN = function (x, n) {
    if (n === void 0) { n = 2; }
    return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
};
var convertFrom = {
    percent: function (x, n) { return roundN(x / n); },
    count: function (x, n) { return roundN(x * n, 0); },
};
var Validators = {
    isNumber: {
        validate: function (x) { return typeof x === "number"; },
        errorMessage: "input is not a number",
    },
    isNonNegative: {
        validate: function (x) { return x >= 0; },
        errorMessage: "input must be greater than 0",
    },
    isInt: {
        validate: function (x) { return Math.floor(x) === x; },
        errorMessage: "input must be an integer",
    },
};
var lessThan = function (bound) { return ({
    validate: function (x) { return x <= bound; },
    errorMessage: "input must be less than " + bound,
}); };
var equalTo = function (val) { return ({
    validate: function (x) { return x === val; },
    errorMessage: "input must be equal to " + val,
}); };
function runValidation(val, validators) {
    for (var _i = 0, validators_1 = validators; _i < validators_1.length; _i++) {
        var validator = validators_1[_i];
        if (!validator.validate(val)) {
            return validator.errorMessage;
        }
    }
    return null;
}
function fillupArrayCount(a, total) {
    var sum = a.reduce(addition);
    var delta = total - sum;
    var div = Math.floor(delta / a.length);
    var mod = delta % a.length;
    var getIndexInc = function (i) { return div + (a.length - i <= mod ? 1 : 0); };
    console.log(a, total, sum, delta, div, mod);
    return a.map(function (x, i) { return x + getIndexInc(i); });
}
exports.fillupArrayCount = fillupArrayCount;
function fillupArrayPercent(a) {
    return fillupArrayCount(a.map(function (x) { return Math.floor(x * 100); }), 100 * 100).map(function (x) { return x / 100; });
}
exports.fillupArrayPercent = fillupArrayPercent;
function fillupArray(a, total, mode) {
    switch (mode) {
        case "count":
            return fillupArrayCount(a, total);
        case "percent":
            return fillupArrayPercent(a);
        default:
            console.error("Invalid mode for fillupArray: " + mode);
            return a;
    }
}
var MyDisposable = (function () {
    function MyDisposable() {
        this.disposeCallbacks = [];
    }
    MyDisposable.prototype.addDisposer = function (disposer) {
        this.disposeCallbacks.push(disposer);
    };
    MyDisposable.prototype.dispose = function () {
        this.disposeCallbacks.forEach(function (cb) { return cb(); });
    };
    return MyDisposable;
}());
var validateMode = function (mode) {
    if (!["percent", "count"].includes(mode)) {
        console.error("Invalid mode set: " + mode);
    }
};
var EvenCustomerDistribution = (function (_super) {
    __extends(EvenCustomerDistribution, _super);
    function EvenCustomerDistribution(total) {
        var _this = _super.call(this) || this;
        _this.controlGroupSize = 0;
        _this.mode = "count";
        _this.errorMessage = null;
        _this.total = total;
        mobx_1.makeObservable(_this, {
            controlGroupSize: mobx_1.observable,
            mode: mobx_1.observable,
            errorMessage: mobx_1.observable,
            onModeChange: mobx_1.action,
            valid: mobx_1.computed,
        });
        _this.addDisposer(mobx_1.reaction(function () { return _this.mode; }, function (mode) { return _this.onModeChange(); }));
        _this.addDisposer(mobx_1.autorun(function () { return validateMode(_this.mode); }));
        return _this;
    }
    EvenCustomerDistribution.prototype.onModeChange = function () {
        var converter = convertFrom[this.mode];
        if (typeof converter !== "function") {
            console.error("error: can't get convertFrom[" + this.mode + "]");
        }
        else {
            this.controlGroupSize = convertFrom[this.mode](this.controlGroupSize, this.total);
        }
    };
    Object.defineProperty(EvenCustomerDistribution.prototype, "valid", {
        get: function () {
            var _this = this;
            var validators = [
                Validators.isNumber,
                Validators.isNonNegative,
            ];
            if (this.mode === "count") {
                validators.push(Validators.isInt);
                validators.push(lessThan(this.total));
            }
            else {
                validators.push(lessThan(100));
            }
            var validationError = runValidation(this.controlGroupSize, validators);
            mobx_1.runInAction(function () {
                _this.errorMessage = validationError;
            });
            return validationError === null;
        },
        enumerable: false,
        configurable: true
    });
    return EvenCustomerDistribution;
}(MyDisposable));
exports.EvenCustomerDistribution = EvenCustomerDistribution;
var initialProportions = function (total, numberOfProportions) {
    return __spreadArrays(Array(numberOfProportions)).map(function (_, i) {
        return i === 0 ? total : 0;
    });
};
var initialProportionsErrorMessages = function (numberOfProportions) {
    return __spreadArrays(Array(numberOfProportions)).map(function () { return null; });
};
var ProportionalCustomerDistribution = (function (_super) {
    __extends(ProportionalCustomerDistribution, _super);
    function ProportionalCustomerDistribution(total, numberOfProportions) {
        var _this = _super.call(this) || this;
        _this.controlGroupSize = 0;
        _this.controlGroupErrorMessage = null;
        _this.mode = "count";
        _this.errorMessage = null;
        _this.highestManuallyChangedIndex = -1;
        _this.total = total;
        _this.proportions = initialProportions(total, numberOfProportions);
        _this.proportionErrorMessages = initialProportionsErrorMessages(numberOfProportions);
        mobx_1.makeObservable(_this, {
            controlGroupSize: mobx_1.observable,
            proportions: mobx_1.observable,
            mode: mobx_1.observable,
            errorMessage: mobx_1.observable,
            proportionErrorMessages: mobx_1.observable,
            onModeChange: mobx_1.action,
            balance: mobx_1.action,
            updateProportion: mobx_1.action,
            valid: mobx_1.computed,
            sumTotal: mobx_1.computed,
        });
        var getBalanceData = function () { return ({
            controlGroupSize: _this.controlGroupSize,
            proportions: __spreadArrays(_this.proportions),
        }); };
        _this.addDisposer(mobx_1.reaction(getBalanceData, function () { return _this.balance(); }));
        _this.addDisposer(mobx_1.reaction(function () { return _this.mode; }, function () { return _this.onModeChange(); }));
        _this.addDisposer(mobx_1.autorun(function () { return validateMode(_this.mode); }));
        return _this;
    }
    ProportionalCustomerDistribution.prototype.updateProportion = function (index, value) {
        this.highestManuallyChangedIndex = Math.max(index, this.highestManuallyChangedIndex);
        this.proportions[index] = value;
    };
    ProportionalCustomerDistribution.prototype.onModeChange = function () {
        var _this = this;
        var converter = convertFrom[this.mode];
        if (typeof converter !== "function") {
            console.error("error: can't get convertFrom[" + this.mode + "]");
        }
        else {
            this.controlGroupSize = converter(this.controlGroupSize, this.total);
            this.proportions.forEach(function (x, i) {
                _this.proportions[i] = converter(x, _this.total);
            });
        }
        this.balance('fromConversion');
    };
    Object.defineProperty(ProportionalCustomerDistribution.prototype, "sumTotal", {
        get: function () {
            return this.proportions.reduce(addition, this.controlGroupSize);
        },
        enumerable: false,
        configurable: true
    });
    ProportionalCustomerDistribution.prototype.balance = function (condition) {
        var _this = this;
        if (condition === void 0) { condition = undefined; }
        var total = this.mode === "count" ? this.total : 100;
        if (condition === 'fromConversion') {
            mobx_1.runInAction(function () {
                _this.proportions = fillupArray(_this.proportions, total, _this.mode).slice(0);
            });
        }
        else if (this.sumTotal < total &&
            this.highestManuallyChangedIndex < this.proportions.length - 1) {
            var v_1 = this.proportions[this.highestManuallyChangedIndex + 1];
            mobx_1.runInAction(function () {
                _this.proportions[_this.highestManuallyChangedIndex + 1] =
                    Math.min(total, v_1 + total - _this.sumTotal);
            });
        }
        else if (this.sumTotal > total &&
            this.highestManuallyChangedIndex < this.proportions.length - 1) {
            mobx_1.runInAction(function () {
                var v = _this.proportions[_this.highestManuallyChangedIndex + 1];
                _this.proportions[_this.highestManuallyChangedIndex + 1] =
                    Math.max(0, v + total - _this.sumTotal);
            });
        }
    };
    Object.defineProperty(ProportionalCustomerDistribution.prototype, "valid", {
        get: function () {
            var _this = this;
            var validators = [
                Validators.isNumber,
                Validators.isNonNegative,
            ];
            var globalValidators = [];
            var expectedSum;
            if (this.mode === "count") {
                validators.push(Validators.isInt);
                globalValidators.push(equalTo(this.total));
            }
            else {
                globalValidators.push(equalTo(100));
            }
            var validationErrors = [];
            var lastValidationError = function () {
                return validationErrors[validationErrors.length - 1];
            };
            validationErrors.push(runValidation(this.controlGroupSize, validators));
            mobx_1.runInAction(function () {
                _this.controlGroupErrorMessage = lastValidationError();
            });
            var _loop_1 = function (i) {
                validationErrors.push(runValidation(this_1.proportions[i], validators));
                mobx_1.runInAction(function () {
                    _this.proportionErrorMessages[i] = lastValidationError();
                });
            };
            var this_1 = this;
            for (var i = 0; i < this.proportions.length; i += 1) {
                _loop_1(i);
            }
            validationErrors.push(runValidation(this.sumTotal, globalValidators));
            mobx_1.runInAction(function () {
                _this.errorMessage = lastValidationError();
            });
            return validationErrors.every(function (x) { return x === null; });
        },
        enumerable: false,
        configurable: true
    });
    return ProportionalCustomerDistribution;
}(MyDisposable));
exports.ProportionalCustomerDistribution = ProportionalCustomerDistribution;
//# sourceMappingURL=CustomerDistributions.js.map