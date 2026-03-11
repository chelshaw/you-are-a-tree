import {
  rollDie,
  // rollZed,
  // rollFib,
  // rollRandomSpike,
  // rollSplit,
  // rollFibDiv,
} from 'you-are-a-tree/utils/random';
import { module, test } from 'qunit';

module('Unit | Utility | random', function () {
  // TODO: Replace this with your real tests.
  test('rollDie', function (assert) {
    let arr = new Array(10).fill(null).map(() => rollDie());
    let lessThan1 = arr.find((a) => a <= 0);
    assert.notOk(lessThan1);
  });
});
