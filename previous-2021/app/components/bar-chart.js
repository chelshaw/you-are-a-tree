import { action } from '@ember/object';
import Component from '@glimmer/component';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
// eslint-disable-next-line no-unused-vars
import { transition } from 'd3-transition';

const barHeight = 10;

export default class BarChartComponent extends Component {
  get data() {
    return [
      {
        value: this.args.amount || 60,
        max: this.args.maxVal || 100,
      },
    ];
  }

  get barColor() {
    return this.args.color || 'green';
  }

  @action
  originalOnInsert(element) {
    // bars stack column-wise
    let max = 30;
    let yScale = scaleLinear()
      .domain([0, max]) // min and max vals Y
      .range([0, 100]); // why? width of svg itself (150px) https://embermap.com/topics/d3/using-scales
    let xScale = scaleBand()
      .domain(this.info.map((i) => i.name))
      .range([0, 100]) // 100 makes it a percentage
      .paddingInner(0.12);
    let svg = select(element);

    let bars = svg
      .selectAll('rect')
      .data(this.info)
      .enter()
      .append('rect')
      .attr('width', `${xScale.bandwidth()}%`)
      .attr('height', (i) => `${yScale(i.count)}%`)
      .attr('x', (i) => `${xScale(i.name)}%`)
      .attr('y', (i) => `${100 - yScale(i.count)}%`);

    bars.on('click', (data) => {
      let clickedLabel = data.name;

      if (this.selected === clickedLabel) {
        // reset
        this.selected = '';
        bars.attr('opacity', 1);
      } else {
        this.selected = clickedLabel;
        bars.filter((b) => b.name !== clickedLabel).attr('opacity', 0.4);
        bars.filter((b) => b.name === clickedLabel).attr('opacity', 1);
      }
    });
  }

  @action
  doUpdate(element, [val, max]) {
    let svg = select(element);

    let xScale = scaleLinear()
      .domain([0, max]) // min and max vals Y
      .range([0, 100]); // width of svg canvas

    svg
      .select('rect')
      .transition()
      .duration(800)
      .attr('width', `${xScale(val)}%`)
      .delay(function (d, i) {
        return i * 100;
      });
  }

  @action onInsert(element) {
    // Probably don't need to bind to data
    let svg = select(element);
    let max = this.data[0].max;
    // Scale so that bars fill left to right
    let xScale = scaleLinear()
      .domain([0, max]) // min and max vals Y
      .range([0, 100]); // width of svg canvas

    let bars = svg.selectAll('rect').data(this.data).enter().data(this.data);
    bars
      .append('rect')
      .attr('width', (d) => `${xScale(d.value)}%`)
      .attr('height', barHeight)
      .attr('fill', this.barColor)
      .attr('x', 0)
      .attr('y', 0);
    bars
      .append('rect')
      .attr('width', `100%`)
      .attr('height', barHeight)
      .attr('stroke', this.barColor)
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 1)
      .attr('x', 0)
      .attr('y', 0);
  }
}
