const PIPE1_ID_GEOMETRY_VERSION = 'pipe1-id-inner-circumference-v1';
const PIPE1_OD_GEOMETRY_VERSION = 'pipe1-od-outer-circumference-v1';
const CENTER_X = 7295;
const CENTER_Y = 14491;
const INNER_RADIUS = 515;
const OUTER_RADIUS = 720;
const LEFT_ID_X = CENTER_X - INNER_RADIUS;
const RIGHT_ID_X = CENTER_X + INNER_RADIUS;
const LEFT_OD_X = CENTER_X - OUTER_RADIUS;
const RIGHT_OD_X = CENTER_X + OUTER_RADIUS;
const ID_DIMENSION_Y = 15588;
const OD_DIMENSION_Y = 13414;
const ID_TEXT_Y = 15772;
const OD_TEXT_Y = 13255;

export function alignPipe1IdGeometry(svgRoot) {
  if (!svgRoot?.querySelectorAll) return svgRoot;

  const lines = [...svgRoot.querySelectorAll('line')];
  const arrows = [...svgRoot.querySelectorAll('[data-pipetools-pipe1-arrowhead]')];

  alignOdGeometry(svgRoot, lines, arrows);
  alignIdGeometry(svgRoot, lines, arrows);

  svgRoot.dataset.pipetoolsPipe1FactoryVersion = 'pipe1-native-slot-contract-v16-od-equal-extension-lines';
  return svgRoot;
}

function alignOdGeometry(svgRoot, lines, arrows) {
  const odHorizontal = findLine(lines, { x1: 6405, y1: OD_DIMENSION_Y, x2: 8160, y2: OD_DIMENSION_Y });
  setLine(odHorizontal, LEFT_OD_X, OD_DIMENSION_Y, RIGHT_OD_X, OD_DIMENSION_Y, 'od');

  const leftExtension = findLine(lines, { x1: 6578, x2: 6578 });
  setLine(leftExtension, LEFT_OD_X, OD_DIMENSION_Y, LEFT_OD_X, CENTER_Y, 'od');

  const rightExtension = findLine(lines, { x1: 8012, x2: 8012 });
  setLine(rightExtension, RIGHT_OD_X, OD_DIMENSION_Y, RIGHT_OD_X, CENTER_Y, 'od');

  const leftArrow = findPolygon(arrows, 6600, OD_DIMENSION_Y);
  setArrow(leftArrow, LEFT_OD_X, OD_DIMENSION_Y, 'right', 'od');

  const rightArrow = findPolygon(arrows, 7985, OD_DIMENSION_Y);
  setArrow(rightArrow, RIGHT_OD_X, OD_DIMENSION_Y, 'left', 'od');

  const odLabel = findStaticLabel(svgRoot, 'OD');
  if (odLabel) {
    odLabel.setAttribute('x', String(LEFT_OD_X));
    odLabel.setAttribute('y', String(OD_TEXT_Y));
    odLabel.setAttribute('text-anchor', 'end');
    odLabel.setAttribute('data-pipetools-pipe1-od-outer-circumference', 'true');
  }

  const odValue = svgRoot.querySelector('[data-pipetools-slot-key="OD"]');
  if (odValue) {
    odValue.setAttribute('x', String(CENTER_X));
    odValue.setAttribute('y', String(OD_TEXT_Y));
    odValue.setAttribute('text-anchor', 'middle');
    odValue.setAttribute('data-pipetools-pipe1-od-outer-circumference', 'true');
  }

  svgRoot.dataset.pipetoolsPipe1OdGeometry = PIPE1_OD_GEOMETRY_VERSION;
}

function alignIdGeometry(svgRoot, lines, arrows) {
  const idHorizontal = findLine(lines, { x1: 6405, y1: ID_DIMENSION_Y, x2: 8160, y2: ID_DIMENSION_Y });
  setLine(idHorizontal, LEFT_ID_X, ID_DIMENSION_Y, RIGHT_ID_X, ID_DIMENSION_Y, 'id');

  const leftExtension = findLine(lines, { x1: 6664, x2: 6664, y2: ID_DIMENSION_Y });
  setLine(leftExtension, LEFT_ID_X, CENTER_Y, LEFT_ID_X, ID_DIMENSION_Y, 'id');

  const rightExtension = findLine(lines, { x1: 7926, x2: 7926, y2: ID_DIMENSION_Y });
  setLine(rightExtension, RIGHT_ID_X, CENTER_Y, RIGHT_ID_X, ID_DIMENSION_Y, 'id');

  const leftArrow = findPolygon(arrows, 6685, ID_DIMENSION_Y);
  setArrow(leftArrow, LEFT_ID_X, ID_DIMENSION_Y, 'right', 'id');

  const rightArrow = findPolygon(arrows, 7905, ID_DIMENSION_Y);
  setArrow(rightArrow, RIGHT_ID_X, ID_DIMENSION_Y, 'left', 'id');

  const idLabel = findStaticLabel(svgRoot, 'ID');
  if (idLabel) {
    idLabel.setAttribute('x', String(LEFT_ID_X));
    idLabel.setAttribute('y', String(ID_TEXT_Y));
    idLabel.setAttribute('text-anchor', 'end');
    idLabel.setAttribute('data-pipetools-pipe1-id-inner-circumference', 'true');
  }

  const idValue = svgRoot.querySelector('[data-pipetools-slot-key="ID"]');
  if (idValue) {
    idValue.setAttribute('x', String(CENTER_X));
    idValue.setAttribute('y', String(ID_TEXT_Y));
    idValue.setAttribute('text-anchor', 'middle');
    idValue.setAttribute('data-pipetools-pipe1-id-inner-circumference', 'true');
  }

  svgRoot.dataset.pipetoolsPipe1IdGeometry = PIPE1_ID_GEOMETRY_VERSION;
}

function setLine(node, x1, y1, x2, y2, dimension = '') {
  if (!node?.setAttribute) return;
  node.setAttribute('x1', String(x1));
  node.setAttribute('y1', String(y1));
  node.setAttribute('x2', String(x2));
  node.setAttribute('y2', String(y2));
  if (dimension === 'od') node.setAttribute('data-pipetools-pipe1-od-outer-circumference', 'true');
  if (dimension === 'id') node.setAttribute('data-pipetools-pipe1-id-inner-circumference', 'true');
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

function setArrow(node, x, y, direction, dimension = '', size = 70) {
  if (!node?.setAttribute) return;
  const points = direction === 'left'
    ? `${x},${y} ${x + size},${y - size / 2} ${x + size},${y + size / 2}`
    : `${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`;
  node.setAttribute('points', points);
  if (dimension === 'od') node.setAttribute('data-pipetools-pipe1-od-outer-circumference', 'true');
  if (dimension === 'id') node.setAttribute('data-pipetools-pipe1-id-inner-circumference', 'true');
}

function findStaticLabel(svgRoot, text) {
  return [...svgRoot.querySelectorAll('[data-pipetools-pipe1-static-label]')]
    .find((node) => String(node.textContent || '').trim() === text);
}

function closeNumber(actual, expected, tolerance = 0.001) {
  const number = Number(actual);
  return Number.isFinite(number) && Math.abs(number - Number(expected)) <= tolerance;
}
