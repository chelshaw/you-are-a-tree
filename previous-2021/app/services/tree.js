import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { rollDie, rollZed } from '../utils/random';
import { task, timeout } from 'ember-concurrency';

const TICK_SPEED = 2000;
export default class TreeService extends Service {
  constructor() {
    super();
    this.species = 'Sycamore';
    this.waterRetention = 8; // out of 10
    this.sunReq = 8; // # hours needed to create php
    this.taproot = false; // can get water deep in the water table
    this.growthRate = 8; // out of 10, grows fast
  }
  @tracked php = 10; // Photosynthesis points AKA Energy
  @tracked leafCount = 8;
  @tracked diameter = 0.1; // meters
  @tracked trunkHeight = 1; // meters
  @tracked rootEnds = 8; // count of ends that can absorb water
  @tracked rootDepth = 0.5; // meters
  @tracked waterStored = 0.5; // TODO: Unit here?
  @tracked waterTable = 1; // meters down

  get displayHeight() {
    return `${Math.floor(this.trunkHeight * 5)}em`;
  }
  get waterStorageTotal() {
    let area = Math.pow(this.diameter / 2, 2) * Math.PI;
    return Math.ceil(area * this.trunkHeight * 10);
  }
  get efficiency() {
    // Efficiency = leaveCount / sun hours
    return this.leafCount / this.sunReq;
  }
  get status() {
    if (this.php <= 0 && this.waterStored <= 0) {
      console.log('is dead');
      return 'Dead';
    }
    if (this.waterStored < 0.1) return 'Stressed';
    return 'Healthy';
  }
  get hasNoPoints() {
    return this.php <= 0;
  }
  updatePhp(newPhp) {
    if (newPhp < 0) {
      this.php = 0;
    } else {
      this.php = Math.ceil(newPhp);
    }
  }
  updateLeaves(newLeaves) {
    if (newLeaves < 0) {
      this.leafCount = 0;
    } else {
      this.leafCount = Math.ceil(newLeaves);
    }
  }
  @task *growLeaves() {
    console.log('grow leaves');
    let amount = rollDie(5);
    this.updatePhp(this.php - amount);
    yield timeout(TICK_SPEED);
    this.updateLeaves(this.leafCount + amount);
    // how many leaves it grows depends on how many branches, PHP spent, water available
  }
  storeWater(newWater) {
    if (this.waterStorageTotal < newWater) {
      console.log('not enough capacity', this.waterStorageTotal);
      newWater = this.waterStorageTotal;
    }
    this.waterStored = newWater;
  }
  @task *absorbWater(evt, efficiency = 0.4) {
    // TODO: Work in water retention, mass here and water table/root depth
    let waterTable = this.waterTable;
    let rootDepth = this.rootDepth;
    if (rootDepth >= waterTable) {
      let waterAmt = this.rootEnds * efficiency;
      let newWater = this.waterStored + waterAmt;
      this.storeWater(newWater);
      this.updatePhp(this.php - 1);
    }
    yield timeout(TICK_SPEED);
    // cost: 1 PhP
    // How much water it can store on an action depends on water table, root depth, and
  }
  @task *growMass(evt, growthSpeed = 1, costRatio = 1) {
    // TODO: calculate better
    let newGrowth = growthSpeed * 0.1;
    let amount = Math.ceil(newGrowth * costRatio);
    console.log('grow mass, php spent:', amount, this.php);
    this.updatePhp(this.php - amount * 5);
    yield timeout(TICK_SPEED);
    this.diameter += newGrowth;
    this.rootDepth += newGrowth;
    this.trunkHeight += newGrowth;
  }
  @task *growRoots(evt, growthSpeed = 1, costRatio = 1) {
    // TODO: calculate better
    let newGrowth = growthSpeed * 0.1;
    let amount = Math.ceil(newGrowth * costRatio);
    console.log('grow mass, php spent:', amount, this.php);
    this.updatePhp(this.php - amount * 5);
    this.diameter += newGrowth;
    this.rootDepth += newGrowth;
    this.trunkHeight += newGrowth;
    yield timeout(TICK_SPEED);
  }
  @action
  makeEnergy(sunshineHours, waterRatio = 5) {
    let php = this.leafCount * Math.floor(sunshineHours / this.sunReq);
    let water = php / waterRatio;
    // console.log('making energy', php, water);
    if (this.waterStored < water) {
      // not enough water for full conversion
      water = this.waterStored;
      php = water * 10;
    }
    this.updatePhp(this.php + php);
    this.waterStored -= water;
    // Can only happen during sunshine hours
    // Will not work if sun levels are less than this.sunReq
    // cost: 2 water, 2 active sun, oxygen
    // which is the limiting factor? Depends on day
    // water + sun / oxygen
  }
  @action
  dailyGrow(weather) {
    console.log({ weather });
    if (this.status === 'Dead') {
      return;
    }
    // let water = this.waterStored + Math.floor(weather.rain) * this.rootEnds;
    if (this.status === 'Stressed') {
      let loss = rollZed(5);
      this.updateLeaves(this.leafCount - loss);
      this.updatePhp(this.php - loss);
      return;
    }
    // Automatic growth that happens based on weather
    // this.diameter += 0.1; // TODO: Change based on season
    // this.leafCount += rollDie(20) >= 15 ? 1 : 0;
    this.waterStored -= 0.1;
    this.updatePhp(this.php - 1);
    this.makeEnergy(weather.sunshine);
    // TODO: adjust water table
    if (weather.rain > 1) {
      this.waterTable -= weather.rain / 10;
    } else if (weather.rain > 0) {
      this.waterTable += 0.1;
    } else {
      this.waterTable -= 0.1;
    }
    let waterTable = this.waterTable;
    let rootDepth = this.rootDepth;
    if (rootDepth >= waterTable) {
      let waterAmt = this.rootEnds * 0.4; // efficiency
      let newWater = this.waterStored + waterAmt;
      this.storeWater(newWater); //   // this.updatePhp(this.php - 1);
    } else {
      let waterAmt = this.rootEnds * 0.1;
      let newWater = this.waterStored + waterAmt;
      this.storeWater(newWater);
    }
  }
}
