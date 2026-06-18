export const SPL2_BUNDLE = Object.freeze({
  id: 'spl2-2d-bundle',
  label: '2D Bundle Calc',
  src: '../spl2-bundle/spl2_master.html',
  upstreamRepo: 'reallaksh19/Simplified_Analysis',
  upstreamPaths: [
    'src/spl2-bundle/Spl2Frame.jsx',
    'public/spl2-bundle/spl2_master.html',
  ],
});

export function getBundleSrc(config = SPL2_BUNDLE) {
  return config.src;
}

export function bundleSummary(config = SPL2_BUNDLE) {
  return `${config.label} from ${config.upstreamRepo}`;
}
