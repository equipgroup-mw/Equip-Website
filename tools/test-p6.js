// Test harness for Tasks 1 and 2 verification
// Run with: node tools/test-p6.js

// Minimal stubs
const document = {
  documentElement: { dataset: {} },
  createElement: () => ({
    getContext: () => ({
      measureText: { textWidth: () => 0 }
    })
  }),
  getElementsByTagName: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

global.document = document;
global.window = {
  Chart: class {
    constructor() { this.data = { labels: [], datasets: [] }; this.options = { scales: {}, plugins: {} }; }
    register() {}
  },
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  matchMedia: () => ({ matches: false }),
  navigator: {},
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};

// Load the file
require('/home/dn40rd/Documents/Equip/equip-site2/equip-site2/js/data-division.js');

// Extract shared builders
const shared = window.__ddCharts || {};
const buildChartConfig = shared.buildChartConfig;

console.log('=== TASK 1: Horizontal Bar Tooltip Fix ===\n');

// Test 1: Check interaction and tooltip options for fuel-africa (horizontalBar)
const fuelAfrica = {
  id: 'fuel-africa',
  type: 'chart',
  chartType: 'horizontalBar',
  labels: ['Malawi', 'Zimbabwe', 'Rwanda', 'Central African Republic', 'Sierra Leone', 'Senegal', 'Seychelles', 'Cabo Verde', 'Tanzania', 'South Africa'],
  series: [{ name: 'Fuel Price (USD per liter)', data: [3.83, 2.08, 2.01, 1.88, 1.78, 1.78, 1.65, 1.63, 1.6, 1.59] }],
  unit: '%',
  prefix: '$',
  dataLabels: { position: 'outside' },
  mode: 'interactive'
};

const cfg = buildChartConfig(fuelAfrica, 'card');
console.log('=== fuel-africa (horizontalBar) ===');
console.log('  options.interaction:', JSON.stringify(cfg.options.interaction));
console.log('  options.plugins.tooltip:', JSON.stringify(cfg.options.plugins.tooltip));
console.log('  indexAxis:', cfg.options.indexAxis);

// Verify horizontalBar has axis: 'y' in interaction and tooltip
const interactionAxis = cfg.options.interaction?.axis;
const tooltipAxis = cfg.options.plugins.tooltip?.axis;
const tooltipMode = cfg.options.plugins.tooltip?.mode;
const tooltipIntersect = cfg.options.plugins.tooltip?.intersect;

console.log('\n  interaction.axis:', interactionAxis, (interactionAxis === 'y') ? '✓' : '✗ FAIL');
console.log('  tooltip.axis:', tooltipAxis, (tooltipAxis === 'y') ? '✓' : '✗ FAIL');
console.log('  tooltip.mode:', tooltipMode, (tooltipMode === 'index') ? '✓' : '✗ FAIL');
console.log('  tooltip.intersect:', tooltipIntersect, (tooltipIntersect === false) ? '✓' : '✗ FAIL');
console.log('  indexAxis:', cfg.options.indexAxis, (cfg.options.indexAxis === 'y') ? '✓' : '✗ FAIL');

// Test vertical bar chart (use different variable name to avoid redeclaration)
console.log('\n=== TASK 1: Vertical Bar Tooltip ===\n');
const smeFormalisationData = {
  id: 'sme-formalisation',
  type: 'chart',
  chartType: 'bar',
  labels: ['Zambia', 'South Africa', 'Malawi', 'Zimbabwe'],
  series: [{ name: '% formalised', data: [58, 69, 37, 65] }],
  unit: '%',
  mode: 'interactive'
};

const cfg2 = buildChartConfig(smeFormalisationData, 'card');
console.log('=== sme-formalisation (bar) ===');
console.log('  options.interaction:', JSON.stringify(cfg2.options.interaction));
console.log('  options.plugins.tooltip:', JSON.stringify(cfg2.options.plugins.tooltip));
console.log('  indexAxis:', cfg2.options.indexAxis);

const interactionAxis2 = cfg2.options.interaction?.axis;
const tooltipAxis2 = cfg2.options.plugins.tooltip?.axis;
const tooltipMode2 = cfg2.options.plugins.tooltip?.mode;
const tooltipIntersect2 = cfg2.options.plugins.tooltip?.intersect;

console.log('\n  interaction.axis:', interactionAxis2, (interactionAxis2 === 'x') ? '✓' : '✗ FAIL');
console.log('  tooltip.axis:', tooltipAxis2, (tooltipAxis2 === 'x') ? '✓' : '✗ FAIL');
console.log('  tooltip.mode:', tooltipMode2, (tooltipMode2 === 'index') ? '✓' : '✗ FAIL');
console.log('  tooltip.intersect:', tooltipIntersect2, (tooltipIntersect2 === false) ? '✓' : '✗ FAIL');
console.log('  indexAxis:', cfg2.options.indexAxis, (cfg2.options.indexAxis === 'x' || cfg2.options.indexAxis === undefined) ? '✓' : '✗ FAIL');

console.log('\n=== TASK 2: Prefix ($) Support ===\n');

// Test the tick callback for fuel-africa
const fuelAfrica2 = {
  id: 'fuel-africa',
  type: 'chart',
  chartType: 'horizontalBar',
  labels: ['Malawi', 'Zimbabwe', 'Rwanda', 'Central African Republic', 'Sierra Leone', 'Senegal', 'Seychelles', 'Cabo Verde', 'Tanzania', 'South Africa'],
  series: [{ name: 'Fuel Price (USD per liter)', data: [3.83, 2.08, 2.01, 1.88, 1.78, 1.78, 1.65, 1.63, 1.6, 1.59] }],
  unit: '%',
  prefix: '$',
  dataLabels: { position: 'outside' },
  mode: 'interactive'
};

const cfg3 = buildChartConfig(fuelAfrica2, 'card');

// Check the tick callback on the value axis (x axis for horizontalBar)
const valAxis1 = cfg3.options.scales.x;
console.log('\n=== TASK 2: Axis Tick Tests for fuel-africa ===');
if (valAxis1 && valAxis1.ticks && valAxis1.ticks.callback) {
  const callback = valAxis1.ticks.callback;
  const testValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  console.log('Axis ticks for fuel-africa (should show $ prefix):');
  testValues.forEach(t => {
    try {
      const result = callback(t);
      console.log(`  ${t} -> ${result}`);
    } catch (e) {
      console.log(`  ${t} -> ERROR: ${e.message}`);
    }
  });
} else {
  console.log('No tick callback found on x axis');
}

// Test tooltip label for fuel-africa
console.log('\n=== Tooltip Label Test for fuel-africa ===');
const tooltipLabel = cfg.options.plugins.tooltip.callbacks.label;
if (tooltipLabel) {
  // Create a mock context for a horizontal bar
  const mockCtx = {
    chart: { options: { indexAxis: 'y' } },
    parsed: { x: 2.08, y: 1 },
    dataset: { label: 'Fuel Price (USD per liter)' },
    datasetIndex: 0
  };
  try {
    const result = cfg.options.plugins.tooltip.callbacks.label(mockCtx);
    console.log('Tooltip for Malawi (2.08):', result, '(expected to contain $2.08)');
  } catch (e) {
    console.log('Tooltip error:', e.message);
  }
}

// Test vertical bar chart again
console.log('\n=== Vertical Bar Tooltip (second test) ===\n');
const smeFormalisationData2 = {
  id: 'sme-formalisation',
  type: 'chart',
  chartType: 'bar',
  labels: ['Zambia', 'South Africa', 'Malawi', 'Zimbabwe'],
  series: [{ name: '% formalised', data: [58, 69, 37, 65] }],
  unit: '%',
  mode: 'interactive'
};

const cfg2b = buildChartConfig(smeFormalisationData2, 'card');
console.log('=== sme-formalisation (bar second) ===');
console.log('  interaction.axis:', cfg2b.options.interaction?.axis, (cfg2b.options.interaction?.axis === 'x') ? '✓' : '✗');
console.log('  tooltip.axis:', cfg2b.options.plugins.tooltip?.axis, (cfg2b.options.plugins.tooltip?.axis === 'x') ? '✓' : '✗');
console.log('  tooltip.mode:', cfg2b.options.plugins.tooltip?.mode, (cfg2b.options.plugins.tooltip?.mode === 'index') ? '✓' : '✗');
console.log('  tooltip.intersect:', cfg2b.options.plugins.tooltip?.intersect, (cfg2b.options.plugins.tooltip?.intersect === false) ? '✓' : '✗');
console.log('  indexAxis:', cfg2b.options.indexAxis);

// Test formatValue via tick callback
console.log('\n=== TASK 2: formatValue via tick callback ===');
const valAxis2 = cfg3.options.scales.x;
if (valAxis2 && valAxis2.ticks && valAxis2.ticks.callback) {
  const callback = valAxis2.ticks.callback;
  const testValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  console.log('Axis ticks for fuel-africa (should show $ prefix):');
  testValues.forEach(t => {
    try {
      const result = callback(t);
      console.log(`  ${t} -> ${result}`);
    } catch (e) {
      console.log(`  ${t} -> ERROR: ${e.message}`);
    }
  });
}

// Test table header
console.log('\n=== Table Header Tests ===');
function getValueHeader(item) {
  const prefix = item.prefix || '';
  const unit = item.unit || '';
  let valueHeader = 'VALUE';
  if(unit === '%'){
    return 'VALUE (%)';
  } else if(prefix){
    return `VALUE (${prefix.trim()})`;
  }
  return 'VALUE';
}

console.log('fuel-africa header:', getValueHeader({prefix: '$', unit: '%'}), '(expected: VALUE ($))');
console.log('sme-formalisation header:', getValueHeader({unit: '%'}), '(expected: VALUE (%))');
console.log('bds-split header:', getValueHeader({unit: '%'}), '(expected: VALUE (%))');

// Test formatValue directly - use different variable name for callback
function formatValueFn(value, item){
  const unit = item.unit || '';
  const prefix = item.prefix || '';
  if(typeof value === 'number'){
    let v = Number(value.toFixed(2)).toString();
    if(v.includes('.')){
      v = v.replace(/0+$/, '');
      if(v.endsWith('.')) v = v.slice(0, -1);
    }
    if(Math.abs(Number(v)) >= 1000){
      v = Number(v).toLocaleString(undefined, {maximumFractionDigits: 2, minimumFractionDigits: 0});
    }
    if(unit === '%'){
      return prefix + v + '%';
    }
    if(unit){
      return prefix + v + ' ' + unit;
    }
    if(prefix){
      return prefix + v;
    }
    return v;
  }
  return String(value);
}

console.log('\n=== formatValue Tests ===');
const tests = [
  { val: 58, item: {unit: '%'}, expect: '58%', desc: '58 with unit "%" gives "58%"' },
  { val: 3.83, item: {prefix: '$'}, expect: '$3.83', desc: '3.83 with prefix "$" gives "$3.83"' },
  { val: 12, item: {unit: 'kg'}, expect: '12 kg', desc: '12 with unit "kg" gives "12 kg"' },
  { val: 127764, item: {prefix: 'MWK '}, expect: 'MWK 127,764', desc: '127764 with prefix "MWK " gives "MWK 127,764"' },
  { val: 1.65, item: {prefix: '$'}, expect: '$1.65', desc: '1.65 with prefix "$" gives "$1.65"' },
  { val: 0.5, item: {prefix: '$'}, expect: '$0.5', desc: '0.5 with prefix "$" gives "$0.5"' },
  { val: 2.5, item: {prefix: '$'}, expect: '$2.5', desc: '2.5 with prefix "$" gives "$2.5"' },
  { val: 2.08, item: {prefix: '$'}, expect: '$2.08', desc: '2.08 with prefix "$" gives "$2.08"' },
  { val: 3.83, item: {unit: '%', prefix: '$'}, expect: '$3.83%', desc: '3.83 with prefix "$" and unit "%" gives "$3.83%"' },
];

let allPass = true;
for (const test of tests) {
  const result = formatValueFn(test.val, test.item);
  const pass = result === test.expect;
  if (!pass) allPass = false;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${test.desc}`);
  if (!pass) console.log(`  Expected: "${test.expect}", Got: "${result}"`);
}

console.log(allPass ? '\nAll formatValue tests PASSED ✓' : '\nSome formatValue tests FAILED ✗');

console.log('\n=== Table Header Tests ===');
function getValueHeader(item) {
  const prefix = item.prefix || '';
  const unit = item.unit || '';
  let valueHeader = 'VALUE';
  if(unit === '%'){
    return 'VALUE (%)';
  } else if(prefix){
    return `VALUE (${prefix.trim()})`;
  }
  return 'VALUE';
}

console.log('fuel-africa header:', getValueHeader({prefix: '$', unit: '%'}), '(expected: VALUE ($))');
console.log('sme-formalisation header:', getValueHeader({unit: '%'}), '(expected: VALUE (%))');
console.log('bds-split header:', getValueHeader({unit: '%'}), '(expected: VALUE (%))');

console.log('\n=== All Tests Complete ===');
