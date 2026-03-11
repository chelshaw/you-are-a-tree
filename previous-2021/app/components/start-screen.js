import Component from '@glimmer/component';
import { task, timeout } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';

export default class StartScreenComponent extends Component {
  constructor() {
    super(...arguments);
    this.delayButton.perform();
  }
  @tracked showButton = false;

  @task *delayButton() {
    yield timeout(5000);
    this.showButton = true;
  }

  fadeIn(element) {
    element.classList.add('fade-in');
  }
  grow(element) {
    element.classList.add('start-grow');
  }
}
