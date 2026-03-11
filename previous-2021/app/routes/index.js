import Route from '@ember/routing/route';

export default class BaseRoute extends Route {
  beforeModel() {
    return this.transitionTo('intro');
  }
}
