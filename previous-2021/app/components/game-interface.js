import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class GameInterfaceComponent extends Component {
  constructor() {
    super(...arguments);
    this.startGame();
  }
  @service game;
  @tracked pauseScreen = false;

  @action
  startGame() {
    this.game.runSeason.perform();
  }

  @action
  pause() {
    this.game.pause();
  }

  @action
  reset() {
    location.reload();
  }
}
