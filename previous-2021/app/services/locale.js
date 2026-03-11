import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task, timeout } from 'ember-concurrency';
import {
  rollRandomSpike,
  rollFibDiv,
  rollSplit,
  rollZed,
} from '../utils/random';
export default class LocaleService extends Service {
  constructor() {
    super(...arguments);
    this.seasonDays = arguments.seasonDays || 91;
    this.location =
      'Traditional territory of the Jumano, Tonkawa, Lipan Apache, and Coahuiltecan Peoples';
  }

  min = 40;
  max = 94;
  @tracked instability = 1;
  @tracked isDrought;
  @tracked temp;
  @tracked rain = 0; // TODO: how is this measured?
  @tracked totalRain = 0;
  @tracked sunshine = 0;
  @tracked totalSun = 0;
  @tracked eventCount = 0;

  resetSeasonalStats() {
    this.totalRain = 0;
    this.totalSun = 0;
    this.eventCount = 0;
  }

  /**
   * Returns the average weather in Fahrenheit
   * @param {number} x the day for which to return weather
   * @returns number
   */
  getTempForDay(x = 0) {
    var amplitude = Math.abs(this.max - this.min) / 2;
    var tempOffset = this.max - amplitude;
    var frequency = (this.seasonDays * 4) / (Math.PI * 2);
    let extreme = rollSplit(this.instability) / 10 + 1;
    let variation = rollRandomSpike(14, true) + rollFibDiv(this.instability);
    return (
      tempOffset + amplitude * (Math.sin(x / frequency) * extreme) + variation
    );
  }

  /**
   * Rain amount for day based on season and temp change
   * @param {number} season index of which season is currently running
   * @param {*} difference number, positive or negative, which indicates the change in weather from yesterday
   * @returns
   */
  getRainForSeason(seasonCt, difference = 0) {
    // rain chance is determined by season, weather, and instability
    // amount of rain is determined by weather + instability
    // negative difference means the temperature dropped, which results in higher chance of rain
    let chanceOfRain; // number out of 20 to beat that allows for rain
    switch (seasonCt % 4) {
      case 0: // spring
        chanceOfRain = 14 + rollSplit(this.instability) - difference;
        break;
      case 1: // summer
        chanceOfRain = 4 - rollSplit(this.instability) - difference;
        break;
      case 2: // fall
        chanceOfRain = 12 - rollSplit(this.instability) - difference;
        break;
      default:
        // winter
        chanceOfRain = 7 - rollSplit(this.instability) - difference;
        break;
    }

    if (this.isDrought || rollZed(20) <= chanceOfRain) {
      return 0;
    }

    return rollZed(10) * rollFibDiv(this.instability);
  }

  getSunshineForSeason(seasonCt, rain) {
    // sunshine is determined by season and whether it rained
    // sunshine is measured in hours, cloud cover counts as half
    // cloudCoverage is calculated from rain and season
    let maxSunHours;
    let cloudCoverage;
    switch (seasonCt % 4) {
      case 1: // summer
        maxSunHours = 16;
        cloudCoverage = 0;
        break;
      case 3: // winter
        maxSunHours = 8;
        cloudCoverage = 8;
        break;
      default:
        // fall, spring
        maxSunHours = 12;
        cloudCoverage = 4;
        break;
    }
    let sunshine;
    if (rain > 4) {
      sunshine = rollZed(4);
    } else if (rain > 0) {
      sunshine = rollZed(maxSunHours - 2);
    } else {
      sunshine = rollZed(maxSunHours);
    }
    let result = sunshine - cloudCoverage * rollFibDiv(this.instability);
    // No negative sunshine
    return 0 > result ? 0 : result;
  }

  /**
   * Weather Event
   * @param {number} temp temperature (F) for the day
   * @param {number} difference temp change from yesterday
   * @param {number} seasonCt idx of season
   */
  getWeatherEvent(temp, difference, seasonCt) {
    let chance = rollZed(20);
    // console.log(chance, this.instability);
    if (3 + this.instability > chance) {
      if (difference < -2) {
        return 'FLOOD';
      } else if (temp > 80) {
        return 'DROUGHT';
      } else if (seasonCt % 4 > 2) {
        return 'FREEZE';
      } else {
        return 'STRONG WINDS';
      }
      // return {
      //   title: 'Weather Event!',
      //   details: 'There is flooding in your area',
      // };
    }
    return null;
  }

  getWeather(x = 0, season = 0) {
    let prevTemp = this.temp;
    let y = this.getTempForDay(x);
    let rain = this.getRainForSeason(season, y - prevTemp);
    let sunshine = this.getSunshineForSeason(rain);
    let event = this.getWeatherEvent(y, y - prevTemp, season);
    if (event) {
      this.eventCount++;
    }

    this.rain = rain;
    this.totalRain = this.totalRain + rain;
    this.sunshine = sunshine;
    this.totalSun = this.totalSun + sunshine;
    this.temp = Math.round(y);

    return {
      x,
      y,
      rain,
      sunshine,
      difference: y - prevTemp,
      event,
    };
  }

  @task *fastSeason(x, season) {
    let finish = x + this.seasonDays;
    while (x <= finish) {
      this.getWeather(x, season);
      yield timeout(250);
      x = x + 1;
    }
    return x;
  }
}
