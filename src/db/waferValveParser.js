import { splitCsvRows } from '../sourceParsers/csvCells.js';

export function parseWaferCheckCsv(text, options = {}) {
  const rows = splitCsvRows(text);
  const classRating = String(options.classRating ?? '150');
  const datasetVersion = options.datasetVersion ?? 'pipedata-db/2026.06.dbphase84';
  const source = options.source ?? '';

  return rows.slice(2).map((cells, index) => {
    const raw = cells.map(clean);
    const nps = raw[0];
    const dn = numberOrNull(raw[1]);
    const outerDia = numberOrNull(raw[2]);
    const faceToFace = numberOrNull(raw[3]);
    const matingBore = numberOrNull(raw[4]);
    const innerDia = numberOrNull(raw[5]);
    const boltCount = numberOrNull(raw[6]);
    const boltLength = numberOrNull(raw[7]);
    const boltDiaMm = numberOrNull(raw[9]);
    const boltDiaUnc = raw[10];
    const waferKg = numberOrNull(raw[11]);

    const row = {
      componentType: 'VALVE',
      valveType: 'WAFER_CHECK',
      endType: 'WAFER',
      classRating,
      facing: 'NA',
      standard: options.standard ?? 'ASME B16.10',
      source,
      datasetVersion,
      nps,
      dn,
      sourceRowNumber: index + 3,
      dimensions: {
        outerDiaMm: tagged(outerDia, 'od', 'mm'),
        faceToFaceMm: tagged(faceToFace, 'Face to Face', 'mm'),
        matingFlangeBoreMm: tagged(matingBore, 'nim mating flg bore', 'mm'),
        innerDiaMm: tagged(innerDia, 'id', 'mm'),
        boltCount: boltCount !== null ? boltCount : null,
        boltLengthMm: tagged(boltLength, 'bolt length', 'mm'),
        boltDiaMm: tagged(boltDiaMm, 'bolt dia M', 'mm'),
        boltDiaUnc: boltDiaUnc || null,
      },
      weights: {
        waferKg: tagged(waferKg, 'Weight Kg', 'kg')
      },
      provenance: {
        standard: options.standard ?? 'ASME B16.10',
        source,
        datasetVersion,
        dataStatus: 'READY',
        sourceRowNumber: index + 3,
      }
    };

    row.id = `VALVE|WAFER_CHECK|WAFER|NPS${nps}|CL${classRating}|NA`;
    row.dataStatus = (outerDia !== null && faceToFace !== null && waferKg !== null) ? 'READY' : 'PARTIAL';
    row.provenance.dataStatus = row.dataStatus;
    return row;
  });
}

export function parseButterflyWaferCsv(text, options = {}) {
  const rows = splitCsvRows(text);
  const classRating = String(options.classRating ?? '150');
  const datasetVersion = options.datasetVersion ?? 'pipedata-db/2026.06.dbphase84';
  const source = options.source ?? '';

  return rows.slice(3).map((cells, index) => {
    const raw = cells.map(clean);
    const nps = raw[0];
    const dn = numberOrNull(raw[1]);
    const faceToFace = numberOrNull(raw[2]);
    const overallHeight = numberOrNull(raw[3]);
    const handleLug = numberOrNull(raw[4]);
    const lugSquare = numberOrNull(raw[5]);
    const bodyWidth = numberOrNull(raw[6]);
    const innerDia = numberOrNull(raw[7]);
    const centreToEnd = numberOrNull(raw[8]);
    const boltPcd = numberOrNull(raw[9]);
    const boltCount = numberOrNull(raw[10]);
    const boltDiaUnc = raw[11];
    const minInnerDia = numberOrNull(raw[12]);
    const projection1 = numberOrNull(raw[13]);
    const projection2 = numberOrNull(raw[14]);
    const waferKg = numberOrNull(raw[15]);
    const boltSizeMetric = raw[16];
    const boltLength = numberOrNull(raw[17]);

    const row = {
      componentType: 'VALVE',
      valveType: 'BUTTERFLY_WAFER',
      endType: 'WAFER',
      classRating,
      facing: 'NA',
      standard: options.standard ?? 'ASME B16.10',
      source,
      datasetVersion,
      nps,
      dn,
      sourceRowNumber: index + 4,
      dimensions: {
        faceToFaceMm: tagged(faceToFace, 'f to f', 'mm'),
        overallHeightMm: tagged(overallHeight, 'oa ht', 'mm'),
        handleLugMm: tagged(handleLug, 'handl lug', 'mm'),
        lugSquareMm: tagged(lugSquare, 'lud sq', 'mm'),
        bodyWidthMm: tagged(bodyWidth, 'width', 'mm'),
        innerDiaMm: tagged(innerDia, 'int dia', 'mm'),
        centreToEndMm: tagged(centreToEnd, 'ctr to end', 'mm'),
        boltPcdMm: tagged(boltPcd, 'pcd', 'mm'),
        boltCount: boltCount !== null ? boltCount : null,
        boltDiaUnc: boltDiaUnc || null,
        minInnerDiaMm: tagged(minInnerDia, 'min id', 'mm'),
        projectionPipe1Mm: tagged(projection1, 'pjn in pipe 1', 'mm'),
        projectionPipe2Mm: tagged(projection2, 'pjn in pipe 2', 'mm'),
        boltSizeMetric: boltSizeMetric || null,
        boltLengthMm: tagged(boltLength, 'LEN', 'mm'),
      },
      weights: {
        waferKg: tagged(waferKg, 'Weight KG', 'kg')
      },
      provenance: {
        standard: options.standard ?? 'ASME B16.10',
        source,
        datasetVersion,
        dataStatus: 'READY',
        sourceRowNumber: index + 4,
      }
    };

    row.id = `VALVE|BUTTERFLY_WAFER|WAFER|NPS${nps}|CL${classRating}|NA`;
    row.dataStatus = (faceToFace !== null && waferKg !== null) ? 'READY' : 'PARTIAL';
    row.provenance.dataStatus = row.dataStatus;
    return row;
  });
}

function tagged(value, sourceColumn, unit) {
  return value === null
    ? { value: null, basis: 'UNAVAILABLE', sourceColumn }
    : { value, basis: 'SOURCE_VALUE', sourceColumn, unit };
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text === '' || text === 'N/A' || text === 'SPA' ? null : text;
}

function numberOrNull(value) {
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
