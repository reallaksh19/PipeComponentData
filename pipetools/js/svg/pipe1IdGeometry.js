const PIPE1_ID_GEOMETRY_VERSION = 'pipe1-id-inner-circumference-v1';
const CENTER_X = 7295;
const CENTER_Y = 14491;
const INNER_RADIUS = 515;
const LEFT_ID_X = CENTER_X - INNER_RADIUS;
const RIGHT_ID_X = CENTER_X + INNER_RADIUS;
const ID_DIMENSION_Y = 15588;
const ID_TEXT_Y = 15772;

export function alignPipe1IdGeometry(svgRoot) {
  if (!svgRoot?.querySelectorAll) return svgRoot;

  const lines = [...svgRoot.querySelectorAll('line')];
  const arrows = [...svgRoot.querySelectorAll('[data-pipetools-pipe1-arrowhead]')];

  const idHorizontal = findLine(lines, { x1: 6405, y1: ID_DIMENSION_Y, x2: 8160, y2: ID_DIMENSION_Y });
  setLine(idHorizontal, LEFT_ID_X, ID_DIMENSION_Y, RIGHT_ID_X, ID_DIMENSION_Y);

  const leftExtension = findLine(lines, { x1: 6664, x2: 6664, y2: ID_DIMENSION_Y });
  setLine(leftExtension, LEFT_ID_X, CENTER_Y, LEFT_ID_X, ID_DIMENSION_Y);

  const rightExtension = findLine(lines, { x1: 7926, x2: 7926, y2: ID_DIMENSION_Y });
  setLine(rightExtension, RIGHT_ID_X, CENTER_Y, RIGHT_ID_X, ID_DIMENSION_Y);

  const leftArrow = findPolygon(arrows, 6685, ID_DIMENSION_Y);
  setArrow(leftArrow, LEFT_ID_X, ID_DIMENSION_Y, 'right');

  const rightArrow = findPolygon(arrows, 7905, ID_DIMENSION_Y);
  setArrow(rightArrow, RIGHT_ID_X, ID_DIMENSION_Y, 'left');

  const idLabel = [...svgRoot.querySelectorAll('[data-pipetools-pipe1-static-label]')]
    .find((node) => String(node.textContent || '').trim() === 'ID');
  if (idLabel) {
    idLabel.setAttribute('x', String(LEFT_ID_X));
    idLabel.setAttribute('y', String(ID_TEXT_Y));
    idLabel.setAttribute('text-anchor', 'end');
  }

  const idValue = svgRoot.querySelector('[data-pipetools-slot-key="ID"]');
  if (idValue) {
    idValue.setAttribute('x', String(CENTER_X));
    idValue.setAttribute('y', String(ID_TEXT_Y));
    idValue.setAttribute('text-anchor', 'middle');
  }

  svgRoot.dataset.pipetoolsPipe1IdGeometry = PIPE1_ID_GEOMETRY_VERSION;
  svgRoot.dataset.pipetoolsPipe1FactoryVersion = 'pipe1-native-slot-contract-v15-id-inner-circumference';
  return svgRoot;
}

function setLine(node, x1, y1, x2, y2) {
  if (!node?.setAttribute) return;
  node.setAttribute('x1', String(x1));
  node.setAttribute('y1', String(y1));
  node.setAttribute('x2', String(x2));
  node.setAttribute('y2', String(y2));
  node.setAttribute('data-pipetools-pipe1-id-inner-circumference', 'true');
}

function findLine(lines, expected) {
  return lines.find((line) => Object.entries(expected).every(([key, value]) => closeNumber(line.getAttribute(key), value)));
}

function findPolygon(polygons, tipX, tipY) {
  return polygons.find((polygon) => {
    const [first] = String(polygon.getAttribute('points') || '').trim().split(/\s+/);
    const [x, y] = String(first || '').split(',').map(Number);
    return closeNumber(x, tipX) && closeNumber(y, tipY);
  });
}

function setArrow(node, x, y, direction, size = 70) {
  if (!node?.setAttribute) return;
  const points = direction === 'left'
    ? `${x},${y} ${x + size},${y - size / 2} ${x + size},${y + size / 2}`
    : `${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`;
  node.setAttribute('points', points);
  node.setAttribute('data-pipetools-pipe1-id-inner-circumference', 'true');
}

function closeNumber(actual, expected, tolerance = 0.001) {
  const number = Number(actual);
  return Number.isFinite(number) && Math.abs(number - Number(expected)) <= tolerance;
}
