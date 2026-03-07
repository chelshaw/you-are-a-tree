import { helper } from '@ember/component/helper';

export default helper(function formatFloat([value, points = 2, ...rest]) {
  if (!value) return 0;
  return value.toFixed(points);
});
