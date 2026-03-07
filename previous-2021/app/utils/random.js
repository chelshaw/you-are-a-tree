/**
 * Roll a random number between and including 1 and max
 * @param max number
 * @returns number between 1 and max (including max)
 */
export const rollDie = (max) => {
  if (max <= 0) return max;
  return Math.ceil(Math.random() * max);
};
/**
 * Roll a random number between and including zero and max
 * @param max number
 * @returns postive number between & including 0 and max
 */
export const rollZed = (max) => {
  if (max <= 0) return max;
  return Math.floor(Math.random() * max + 1);
};
/**
 * Random number that could be equal ways positive or negative
 * @param max number of total options
 */
export const rollSplit = (max) => {
  if (max <= 0) return max;
  return rollDie(max) - Math.floor((max + 1) / 2);
};
/**
 * Returns a fibonacci sequence number up to 144
 * @param split boolean, controls whether to optionally return negative
 */
export const rollFib = (split = false) => {
  if (split) {
    let number = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144][
      Math.floor(Math.random() * 12)
    ];
    let negative = (Math.random() * 20) % 2 === 0;
    return negative ? number * -1 : number;
  }
  return [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144][
    Math.floor(Math.random() * 12)
  ];
};
/**
 * Returns a very small, fib-randomized number
 * @param base number that fib divides, should be whole and > 0
 */
export const rollFibDiv = (base = 1) => base / rollFib();

export const rollRandomSpike = (max = 20, split = false, mod = 7) => {
  let roll = split ? rollSplit(max) : rollDie(max);
  if (roll % mod === 0) {
    return roll * 1.5;
  }
  return roll;
};
