const {
  EvenCustomerDistribution,
  fillupArrayCount,
  fillupArrayPercent,
  ProportionalCustomerDistribution,
} = require("./dist/dists.js");
const { runInAction, autorun, observable, reaction } = require("mobx");

const expect = (...m) => console.log("expect:", ...m);

console.log(Date());

function demoEven() {
  const evenDist = new EvenCustomerDistribution(10);

  expect(0);
  autorun(() => console.log(evenDist.controlGroupSize));
  expect(null);
  autorun(() => console.log(evenDist.errorMessage));
  expect(true);
  autorun(() => console.log(evenDist.valid));

  expect(5);
  runInAction(() => {
    evenDist.controlGroupSize = 5;
  });

  expect(10);
  runInAction(() => {
    evenDist.controlGroupSize = 10;
  });

  expect(11);
  expect(false);
  expect("too big");
  runInAction(() => {
    evenDist.controlGroupSize = 11;
  });

  expect(5);
  expect(true);
  expect(null);
  runInAction(() => {
    evenDist.controlGroupSize = 5;
  });

  // autorun(() => console.log(evenDist.mode));
  expect(0.5);
  runInAction(() => {
    evenDist.mode = "percent";
  });

  expect("error");
  runInAction(() => {
    evenDist.mode = "percentage";
  });

  console.log("done");
}

function demoObservableArray() {
  const a = observable([1, 2, 3]);
  // autorun(() => console.log('autorun', ...a));
  reaction(
    () => [...a],
    () => console.log("reaction", a)
  );

  runInAction(() => {
    a[1] = "foo";
  });
  runInAction(() => {
    a[0] = "bar";
  });
}

function demoFillupArray() {
  b = [1, 2, 3];
  console.log(fillupArrayCount(b, 8));

  p = [12.98, 35.12, 13.43];
  console.log(fillupArrayPercent(p));
  console.log(fillupArrayPercent(p).reduce((x, y) => x + y));
}

function demoProportionalDistribution() {
  const p = new ProportionalCustomerDistribution(10,4);
  expect(0,10,0,0,0,10);
  autorun(() => console.log(p.controlGroupSize,[...p.proportions],p.sumTotal));
  expect(true);
  autorun(() => console.log(p.valid));
  expect(null);
  autorun(() => console.log(p.controlGroupErrorMessage, [...p.proportionErrorMessages], p.errorMessage));
  runInAction(() => { p.controlGroupSize = 5; });
  expect('good');
  runInAction(() => { p.controlGroupSize = 0; });
  expect('good');
  runInAction(() => { p.controlGroupSize = 5; });
  expect('good');
  runInAction(() => { p.controlGroupSize = 10; });
  expect('good');
  runInAction(() => { p.updateProportion(1,5); p.controlGroupSize = 5;});
  expect('bad');
  runInAction(() => { p.updateProportion(0,3); });
  expect('good');
  runInAction(() => { p.controlGroupSize = 1; });
}

// demoEven();
// demoFillupArray
demoProportionalDistribution();
