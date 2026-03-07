import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task, timeout, waitForProperty } from 'ember-concurrency';
import LocaleService from './locale';
import TreeService from './tree';

const TICK_RATE = 2000;
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const SEASON_DAYS = 20; // TODO: season days should be 91

/**
 * You Are A Tree
 * Game of planning and execution. Has 3 modes: season (action), shopping (marketplace), and planning (inventory)
 */
export default class GameService extends Service {
  constructor() {
    super();
    this.species = 'Sycamore';
    this.locale = new LocaleService({ seasonDays: SEASON_DAYS });
    this.tree = new TreeService({ species: 'Sycamore' });
    this.started = false;
  }

  @tracked fastMode = false;
  @tracked tempUnit = 'F';
  // Time-based things tracked here
  @tracked clock = 0;
  @tracked stopClock = -1;
  @tracked paused = false;
  @tracked seasonCount = 0;
  @tracked year = 1;
  @tracked event = false;
  @tracked gameState = 'INIT'; // 'SEASON', 'STORE', 'ACTIONS'
  // @tracked species = 'oak';
  get gameOver() {
    return this.tree.status === 'Dead';
  }
  get seasonName() {
    return SEASONS[this.seasonCount % 4];
  }
  get day() {
    return this.clock % SEASON_DAYS;
  }
  nextYear() {
    this.year++;
  }
  nextSeason(fakeCount = false) {
    this.seasonCount++;
    if (this.seasonCount > 0 && this.seasonCount % 4 === 0) {
      this.nextYear();
    }
    if (fakeCount) {
      this.clock += SEASON_DAYS;
    }
  }

  tick() {
    this.clock++;
    // TODO: Pause here instead of runDays?
    let weather = this.locale.getWeather(this.clock, this.seasonCount);
    if (weather.event) {
      this.event = weather.event;
      this.pause();
    }
    this.tree.dailyGrow(weather);
    return this.clock;
  }

  @task *runSeason(setNumber = SEASON_DAYS) {
    this.stopClock = this.clock + setNumber;
    this.locale.resetSeasonalStats();
    if (this.fastMode) {
      this.clock++;
      let newClock = yield this.locale.fastSeason.perform(this.clock);
      this.clock = newClock;
    } else {
      yield this.runDays.perform();
    }
    if (!this.gameOver) {
      this.nextSeason();
    }
  }

  @task *runDays() {
    while (this.clock < this.stopClock && !this.gameOver) {
      if (this.paused) {
        yield this.pauseWaiter.perform();
      }
      if (this.gameOver) {
        console.log('cancelling');
        this.runSeason.cancelAll();
      }
      this.tick();
      yield timeout(TICK_RATE);
    }
  }

  pause() {
    this.paused = !this.paused;
  }
  @task *pauseWaiter() {
    yield waitForProperty(this, 'paused', false);
    this.event = '';
  }
}
