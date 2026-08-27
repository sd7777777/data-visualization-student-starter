import { useCallback, useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { useDimensions } from './useDimensions';

interface Bee {
  id: string;
  x: number;
  y: number;
  label: string;
  note: string;
  color: string;
}

const initialBees: Bee[] = [
  {
    id: 'clover',
    x: 132,
    y: 391,
    label: 'Clover',
    note: 'Starting the morning with a sweet clover patch.',
    color: '#facc15',
  },
  {
    id: 'lavender',
    x: 330,
    y: 349,
    label: 'Lavender',
    note: 'A calm stop for nectar and a little pollen.',
    color: '#fbbf24',
  },
  {
    id: 'wildflower',
    x: 410,
    y: 192,
    label: 'Wildflower',
    note: 'The route gets interesting where the wildflowers grow.',
    color: '#f59e0b',
  },
  {
    id: 'sunflower',
    x: 527,
    y: 257,
    label: 'Sunflower',
    note: 'A bright detour with plenty of room to explore.',
    color: '#fcd34d',
  },
  {
    id: 'goldenrod',
    x: 688,
    y: 119,
    label: 'Goldenrod',
    note: 'This golden patch sends the flight path skyward.',
    color: '#f97316',
  },
  {
    id: 'hive',
    x: 878,
    y: 55,
    label: 'The Hive',
    note: 'Home again, with a full pollen basket.',
    color: '#d97706',
  },
];

const pollen = [
  { x: 90, y: 130, size: 4, delay: '0s' },
  { x: 240, y: 88, size: 3, delay: '0.7s' },
  { x: 615, y: 385, size: 4, delay: '1.3s' },
  { x: 802, y: 292, size: 3, delay: '0.4s' },
  { x: 912, y: 410, size: 5, delay: '1.1s' },
];

const ORIGINAL_WIDTH = 960;
const ORIGINAL_HEIGHT = 500;
const BEE_RADIUS = 18;

export function ResponsivePseudoScatterPlot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: divRef, dimensions } = useDimensions();
  const [bees, setBees] = useState(() => initialBees.map((bee) => ({ ...bee })));
  const [selectedBeeId, setSelectedBeeId] = useState(initialBees[0].id);
  const resetRoute = useCallback(() => {
    setBees(initialBees.map((bee) => ({ ...bee })));
    setSelectedBeeId(initialBees[0].id);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0) return;

    const xScale = scaleLinear().domain([0, ORIGINAL_WIDTH]).range([0, dimensions.width]);
    const yScale = scaleLinear().domain([0, ORIGINAL_HEIGHT]).range([0, dimensions.height]);
    const isCompact = dimensions.width < 600;
    const selectedBee = bees.find((bee) => bee.id === selectedBeeId) ?? bees[0];
    const chart = select(svg);
    let removeDragListeners: (() => void) | undefined;

    const flightPath = () =>
      bees
        .map((bee, index) => `${index === 0 ? 'M' : 'L'} ${xScale(bee.x)} ${yScale(bee.y)}`)
        .join(' ');
    const clamp = (value: number, minimum: number, maximum: number) =>
      Math.max(minimum, Math.min(maximum, value));

    chart.selectAll('*').remove();

    const defs = chart.append('defs');
    const background = defs
      .append('linearGradient')
      .attr('id', 'honey-background')
      .attr('x2', '0')
      .attr('y2', '1');
    background.append('stop').attr('offset', '0%').attr('stop-color', '#fff9dc');
    background.append('stop').attr('offset', '100%').attr('stop-color', '#fef3c7');
    const glow = defs
      .append('radialGradient')
      .attr('id', 'honey-glow')
      .attr('cx', '76%')
      .attr('cy', '16%')
      .attr('r', '70%');
    glow
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#fbbf24')
      .attr('stop-opacity', 0.2);
    glow
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#fbbf24')
      .attr('stop-opacity', 0);
    defs
      .append('pattern')
      .attr('id', 'honeycomb')
      .attr('width', 72)
      .attr('height', 62)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path')
      .attr('d', 'M18 1 L54 1 L71 31 L54 61 L18 61 L1 31 Z')
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1.5);

    chart
      .append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', 'url(#honey-background)');
    chart
      .append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', 'url(#honeycomb)');
    chart
      .append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', 'url(#honey-glow)');

    const pollenLayer = chart.append('g').attr('fill', '#f59e0b').attr('fill-opacity', 0.7);
    const pollenDots = pollenLayer
      .selectAll('circle')
      .data(pollen)
      .join('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', (d) => d.size);
    pollenDots
      .append('animate')
      .attr('attributeName', 'cy')
      .attr('values', (d) => `${yScale(d.y)};${yScale(d.y - 14)};${yScale(d.y)}`)
      .attr('dur', '3s')
      .attr('begin', (d) => d.delay)
      .attr('repeatCount', 'indefinite');
    pollenDots
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.25;1;0.25')
      .attr('dur', '3s')
      .attr('begin', (d) => d.delay)
      .attr('repeatCount', 'indefinite');

    chart
      .append('text')
      .attr('x', isCompact ? 20 : 32)
      .attr('y', isCompact ? 34 : 42)
      .attr('fill', '#78350f')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', isCompact ? 17 : 22)
      .attr('font-weight', 800)
      .text('Honeybee Flight Map');
    chart
      .append('text')
      .attr('x', isCompact ? 20 : 32)
      .attr('y', isCompact ? 55 : 68)
      .attr('fill', '#a16207')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', isCompact ? 11 : 13)
      .attr('font-weight', 600)
      .text(
        isCompact
          ? 'Drag a bee or tap one to explore'
          : 'Drag a bee to redraw its route • Click one to explore its stop',
      );

    const resetControl = chart
      .append('g')
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', 'Reset bee flight route')
      .attr('transform', `translate(${dimensions.width - (isCompact ? 126 : 148)}, 20)`)
      .style('cursor', 'pointer');
    resetControl
      .append('rect')
      .attr('width', isCompact ? 106 : 128)
      .attr('height', 34)
      .attr('rx', 17)
      .attr('fill', '#fffbeb')
      .attr('fill-opacity', 0.94)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.5);
    resetControl
      .append('text')
      .attr('x', isCompact ? 53 : 64)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('fill', '#92400e')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', isCompact ? 11 : 12)
      .attr('font-weight', 800)
      .text('Reset route');

    chart
      .append('path')
      .attr('class', 'flight-path')
      .attr('d', flightPath())
      .attr('fill', 'none')
      .attr('stroke', '#92400e')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', '3 10')
      .attr('opacity', 0.8)
      .append('animate')
      .attr('attributeName', 'stroke-dashoffset')
      .attr('values', '0;-52')
      .attr('dur', '2.4s')
      .attr('repeatCount', 'indefinite');

    const beeGroups = chart
      .append('g')
      .selectAll('g')
      .data(bees)
      .join('g')
      .attr('data-bee-id', (d) => d.id)
      .attr('transform', (d) => `translate(${xScale(d.x)}, ${yScale(d.y)})`)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', (d) => `${d.label} bee. ${d.note}`)
      .style('cursor', 'grab')
      .style('touch-action', 'none');

    beeGroups
      .append('circle')
      .attr('r', BEE_RADIUS * 2.25)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.18)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', `${BEE_RADIUS * 2};${BEE_RADIUS * 2.55};${BEE_RADIUS * 2}`)
      .attr('dur', '2.6s')
      .attr('begin', (_d, index) => `${index * 0.25}s`)
      .attr('repeatCount', 'indefinite');
    beeGroups
      .append('circle')
      .attr('class', 'bee-shell')
      .attr('r', BEE_RADIUS + 5)
      .attr('fill', '#fef3c7')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 3);
    beeGroups
      .append('circle')
      .attr('r', BEE_RADIUS + 10)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '3 5')
      .attr('opacity', (d) => (d.id === selectedBeeId ? 1 : 0));

    const wings = beeGroups.append('g').attr('fill', '#ffffff').attr('fill-opacity', 0.78);
    wings.append('ellipse').attr('cx', -8).attr('cy', -8).attr('rx', 9).attr('ry', 5);
    wings.append('ellipse').attr('cx', 8).attr('cy', -8).attr('rx', 9).attr('ry', 5);
    wings
      .selectAll('ellipse')
      .append('animate')
      .attr('attributeName', 'ry')
      .attr('values', '3;7;3')
      .attr('dur', '0.55s')
      .attr('repeatCount', 'indefinite');

    const beeBody = beeGroups.append('g');
    beeBody
      .append('ellipse')
      .attr('rx', 13)
      .attr('ry', 9)
      .attr('fill', (d) => d.color);
    [-5, 0, 5].forEach((x) =>
      beeBody
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', -7)
        .attr('y2', 7)
        .attr('stroke', '#422006')
        .attr('stroke-width', 2.4)
        .attr('stroke-linecap', 'round'),
    );
    beeBody.append('circle').attr('cx', 11).attr('r', 3).attr('fill', '#422006');

    beeGroups
      .append('text')
      .attr('x', (d) => (xScale(d.x) > dimensions.width - 120 ? -28 : 28))
      .attr('y', -22)
      .attr('text-anchor', (d) => (xScale(d.x) > dimensions.width - 120 ? 'end' : 'start'))
      .attr('fill', '#78350f')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', isCompact ? 11 : 13)
      .attr('font-weight', 800)
      .text((d) => d.label);

    const panelWidth = isCompact ? dimensions.width - 40 : 308;
    const panelX = isCompact ? 20 : dimensions.width - panelWidth - 32;
    const panelY = dimensions.height - (isCompact ? 92 : 104);
    const infoPanel = chart.append('g').attr('transform', `translate(${panelX}, ${panelY})`);
    infoPanel
      .append('rect')
      .attr('width', panelWidth)
      .attr('height', isCompact ? 72 : 84)
      .attr('rx', 16)
      .attr('fill', '#fffbeb')
      .attr('fill-opacity', 0.92)
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 1.5);
    infoPanel
      .append('circle')
      .attr('cx', 22)
      .attr('cy', 24)
      .attr('r', 8)
      .attr('fill', selectedBee.color);
    infoPanel
      .append('text')
      .attr('x', 38)
      .attr('y', 29)
      .attr('fill', '#78350f')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', isCompact ? 13 : 15)
      .attr('font-weight', 800)
      .text(selectedBee.label);
    infoPanel
      .append('text')
      .attr('x', 22)
      .attr('y', 54)
      .attr('fill', '#92400e')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', isCompact ? 10 : 12)
      .text(selectedBee.note);

    const selectBee = (bee: Bee) => setSelectedBeeId(bee.id);

    beeGroups
      .on('pointerenter', function () {
        select(this).select<SVGCircleElement>('.bee-shell').attr('stroke-width', 5);
      })
      .on('pointerleave', function () {
        select(this).select<SVGCircleElement>('.bee-shell').attr('stroke-width', 3);
      })
      .on('click', (_event, bee) => selectBee(bee))
      .on('keydown', (event: KeyboardEvent, bee) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectBee(bee);
        }
      })
      .on('pointerdown', function (event: PointerEvent, bee) {
        event.preventDefault();
        removeDragListeners?.();
        const element = event.currentTarget as SVGGElement;
        select(element).style('cursor', 'grabbing');

        const moveBee = (moveEvent: PointerEvent) => {
          const bounds = svg.getBoundingClientRect();
          const nextX = clamp(
            ((moveEvent.clientX - bounds.left) / bounds.width) * ORIGINAL_WIDTH,
            BEE_RADIUS * 1.5,
            ORIGINAL_WIDTH - BEE_RADIUS * 1.5,
          );
          const nextY = clamp(
            ((moveEvent.clientY - bounds.top) / bounds.height) * ORIGINAL_HEIGHT,
            BEE_RADIUS * 1.5,
            ORIGINAL_HEIGHT - BEE_RADIUS * 1.5,
          );
          bee.x = nextX;
          bee.y = nextY;
          select(element).attr('transform', `translate(${xScale(nextX)}, ${yScale(nextY)})`);
          chart.select('.flight-path').attr('d', flightPath());
        };

        const finishDrag = () => {
          setBees(bees.map((currentBee) => ({ ...currentBee })));
          setSelectedBeeId(bee.id);
          select(element).style('cursor', 'grab');
          removeDragListeners?.();
        };

        window.addEventListener('pointermove', moveBee);
        window.addEventListener('pointerup', finishDrag, { once: true });
        window.addEventListener('pointercancel', finishDrag, { once: true });
        removeDragListeners = () => {
          window.removeEventListener('pointermove', moveBee);
          window.removeEventListener('pointerup', finishDrag);
          window.removeEventListener('pointercancel', finishDrag);
          removeDragListeners = undefined;
        };
      });

    resetControl.on('click', resetRoute).on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        resetRoute();
      }
    });

    return () => removeDragListeners?.();
  }, [bees, dimensions, resetRoute, selectedBeeId]);

  return (
    <div ref={divRef} className="relative h-full w-full">
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="An animated, interactive honeybee flight map with six draggable bee bubbles"
      />
    </div>
  );
}
