import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class SidebarComponent extends Component {
  @service game;

  @action
  runSeason() {
    this.game.runSeason.perform();
  }

  @action
  pause() {
    this.game.pause();
  }

  @action
  nextSeason() {
    this.game.nextSeason(true);
  }
}
