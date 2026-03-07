import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/* From https://codepen.io/jamesmichael/pen/wGeNvq?editors=1010 */
// var WIDTH_GROWTH = 0.1;
// var HEIGHT_GROWTH_FACTOR = 1;
// var BRANCH_AT_WIDTH = 4;
// var MAX_WIDTH = 16;
// var BRANCHING_RATIO = 0.618;
// var MAJOR_BRANCH_FACTOR = 1.0;
// var BRANCH_ANGLE = 20.0;
// var BRANCH_SAG_FACTOR = 0.01;
// var LEAF_SIZE = 32;

export default class TreeComponent extends Component {
  @service('tree') treeStats;
  @tracked root;

  draw() {
    let ox = 250;
    let oy = 250;
    let x = 250;
    let y = 100;
    this.context.strokeStyle = '#715d47';
    this.context.beginPath();
    this.context.lineWidth = '80px';
    this.context.moveTo(ox, oy);
    this.context.lineTo(x, y);
    this.context.stroke();
    // this.context.closePath();

    // if (this.width < BRANCH_AT_WIDTH + WIDTH_GROWTH) {
    // DrawLeaf(this.x, this.y, this.angle + Math.PI / 6);
    // DrawLeaf(this.x, this.y, this.angle + Math.PI / 3);
    // DrawLeaf(this.x, this.y, this.angle);
    // DrawLeaf(this.x, this.y, this.angle - Math.PI / 6);
    // DrawLeaf(this.x, this.y, this.angle - Math.PI / 3);
    // }
  }
  @action drawTree(element) {
    console.log('draw!', element);
    this.canvas = element;
    this.context = element.getContext('2d');
    console.log(this.context);
    // this.root = new Branch();
    // this.root.seed(250, 250, 0, 1, 0, true);
    // const params = this.root.grow();
    // console.log({ params });
    this.draw();
  }
}
