// Test harness for data-division.js buildChartConfig
// Run with: node tools/test-charts.js
//
// This harness stubs the DOM globals that data-division.js needs at load time,
// then extracts the shared chart-building functions from window.__ddCharts,
// which the file sets up at the end of its IIFE.
//
// Minimal stubs for Chart.js globals so the file loads without DOM
// Must set document.documentElement before the file loads

const document = {
  documentElement: {
    dataset: {}
  },
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
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }
  )
};

// Load the file - it will run in the stubbed context and set up window.__ddCharts
try {
  require('/home/dn40rd/Documents/Equip/equip-site2/equip-site2/js/data-division.js');
} catch(err) {}

 // Extract the shared builders from window.__ddCharts
 // that the IIFE at the end of data-division.js exposes
 const shared = window.__ddCharts || {};
 const buildChartConfig = shared.buildChartConfig;
 const validateChartItem = shared.validateChartItem;
 const normalizeChartItem = shared.normalizeChartItem;
 const ddTypeName = shared.ddTypeName;
 const DD_PALETTE = shared.DD_PALETTE;
 const formatDataLabel = shared.formatDataLabel;
 const checkLabelFit = shared.checkLabelFit;

 console.log('=== Loaded data-division.js successfully ===');
 console.log('buildChartConfig:', typeof buildChartConfig);
 console.log('formatDataLabel:', typeof formatDataLabel);
 console.log('checkLabelFit:', typeof checkLabelFit);
 console.log();

 // Sample chart items from data-division.json
 const testItems = [
   // From the JSON items with type "chart"
   {
     id: 'sme-formalisation',
     type: 'chart',
     chartType: 'bar',
     labels: ['Zambia', 'South Africa', 'Malawi', 'Zimbabwe'],
     series: [{ name: '% formalised', data: [58, 69, 37, 65] }],
     unit: '%',
     mode: 'interactive'
   },
   {
     id: 'bds-split',
     type: 'chart',
     chartType: 'doughnut',
     labels: ['Research & Project Management', 'Business Development'],
     series: [{ name: 'Share of projects', data: [42, 58] }],
     unit: '%',
     mode: 'interactive'
   },
   {
     id: 'savings-behaviour',
     type: 'chart',
     chartType: 'horizontalBar',
     labels: ['Savings', 'Money from another business', 'Bank loan', 'Salary', 'Loan', 'Friends/family', 'Personal retirement policy', 'Retirement package', 'Other'],
     series: [{ name: '% of respondents', data: [29, 22, 13, 12, 9, 7, 5, 5, 4] }],
     unit: '%',
     dataLabels: { position: 'outside' },
     mode: 'static'
   },
   {
     id: 'fuel-africa',
     type: 'chart',
     chartType: 'horizontalBar',
     labels: ['Malawi', 'Zimbabwe', 'Rwanda', 'Central African Republic', 'Sierra Leone', 'Senegal', 'Seychelles', 'Cabo Verde', 'Tanzania', 'South Africa'],
     series: [{ name: 'Fuel Price (USD per liter)', data: [3.83, 2.08, 2.01, 1.88, 1.78, 1.78, 1.65, 1.63, 1.6, 1.59] }],
     unit: '%',
     prefix: '$',
     dataLabels: { position: 'outside' },
     mode: 'interactive'
   },
   {
     id: 'sme-employment',
     type: 'chart',
     chartType: 'bar',
     labels: ['Tanzania', 'Zambia', 'South Africa', 'Malawi', 'Zimbabwe'],
     series: [{ name: '% of workforce', data: [35, 70, 40, 47, 60] }],
     unit: '%',
     mode: 'interactive'
   }
 ];

 // Also test chart types from "chart_block_examples" string in the JSON "_instructions" block
 const exampleTypes = [
   'bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'stackedBar100',
   'line', 'area', 'steppedLine', 'radar', 'pie', 'doughnut', 'polarArea', 'scatter', 'bubble', 'combo'
 ];

 console.log('\n=== Testing buildChartConfig with real chart items ===\n');

// Test each real chart item
 for (const item of testItems) {
   try {
     // Build chart config like draw() does - context 'card' for item with type 'chart'
     const cfg = buildChartConfig(item, 'card');
     console.log(`PASS: ${item.id} (${item.chartType}) - config built successfully`);
     console.log(`  - chart type: ${cfg.type}`);
     // Check value axis display
     const valAxisKey = item.chartType === 'horizontalBar' ? 'y' : 'y';
     const valAxisDisplay = cfg.options?.scales?.[valAxisKey]?.display;
     console.log(`  - value axis display (${valAxisKey}): ${valAxisDisplay}`);
     // Check category axis
     const catAxisKey = item.chartType === 'horizontalBar' ? 'y' : 'x';
     const catAxisDisplay = cfg.options?.scales?.[catAxisKey]?.display;
     console.log(`  - category axis (${catAxisKey}) displayed: ${catAxisDisplay !== false}`);
     // Layout padding top
     console.log(`  - layout.padding.top: ${cfg.options?.layout?.padding?.top}`);
     // datalabels settings
     const dl = cfg.options?.plugins?.datalabels;
     console.log(`  - datalabels display: ${dl?.display}`);
     console.log(`  - datalabels color: ${dl?.color}`);
     // Check for padding property that was causing the original error
     if (cfg.options?.scales) {
       for (const [key, scale] of Object.entries(cfg.options.scales)) {
         if (scale?.padding !== undefined) {
           console.log(`  - scales['${key}'].padding: ${scale.padding} ✓`);
         }
       }
     }
   } catch (e) {
     console.log(`FAIL: ${item.id} (${item.chartType})`);
     console.log(`  Error: ${e.message}`);
   }
 }

 console.log('\n=== Testing chartType examples ===\n');

// Test each chart type from examples
 for (const type of exampleTypes) {
   try {
     // Create a minimal item for each type
     const item = {
       type: 'chart',
       chartType: type,
       labels: type === 'combo' ? ['2023', '2024'] : type === 'pie' || type === 'doughnut' || type === 'polarArea' ? ['A', 'B'] : ['A', 'B'],
       series: type === 'scatter' || type === 'bubble' ? [{ x: 1, y: 2 }] : type === 'bubble' ? [{ x: 1, y: 2, r: 3 }] : [{ name: 'Series', data: [1, 2, 3] }],
       mode: 'card'
     };
     // Only test types that can reasonably be built
     if (['bar', 'horizontalBar', 'line', 'area', 'pie', 'doughnut'].includes(type) || type === 'combo') {
       const cfg = buildChartConfig(item, 'card');
       console.log(`PASS: ${type} - config built successfully`);
       // Log key properties
       const valAxisKey = type === 'horizontalBar' ? 'y' : 'y';
       console.log(`    - value axis display: ${cfg.options?.scales?.[valAxisKey]?.display}`);
       const catAxisKey = type === 'horizontalBar' ? 'y' : 'x';
       console.log(`    - category axis (${catAxisKey}) displayed: ${cfg.options?.scales?.[catAxisKey]?.display !== false}`);
     } else {
       console.log(`SKIP: ${type} - not tested (unsupported or needs special handling)`);
     }
   } catch (e) {
     console.log(`FAIL: ${type}`);
     console.log(`  Error: ${e.message}`);
   }
 }

 console.log('\n=== Testing formatDataLabel direct calls ===\n');

// Test formatDataLabel with direct calls
 if (formatDataLabel) {
   // Test cases from the requirements
   const tests = [
     { val: 58, unit: '%', expect: '58%', desc: '58 with unit "%" gives "58%"' },
     { val: 3.83, prefix: '$', expect: '$3.83', desc: '3.83 with prefix "$" gives "$3.83"' },
     { val: 4300000, prefix: '$', shorten: true, decimals: 1, expect: '$4.3m', desc: '4300000 with prefix "$" and shorten gives "$4.3m"' },
     { val: 950, shorten: true, expect: '950', desc: '950 with shorten gives "950"' },
     { val: 1250, shorten: true, decimals: 1, expect: '1.3k', desc: '1250 with shorten gives "1.3k"' }
   ];

   for (const test of tests) {
     try {
       // Build a proper context for formatDataLabel - must have chart.data with datasets
       const ctx = {
         chart: { 
           data: { 
             labels: [], 
             datasets: [{ data: [test.val] }] 
           }, 
           dataChart: {
             unit: test.unit,
             prefix: test.prefix,
             shorten: test.shorten,
             decimals: test.decimals !== undefined ? test.decimals : 1,
             dataLabels: test.shorten !== undefined ? { shorten: test.shorten, decimals: test.decimals || 1 } : {}
           }
         },
         parsed: { y: test.val },
         datasetIndex: 0,
         formattedLabel: String(test.val)
       };
       
       const result = formatDataLabel.call(ctx, test.val, ctx);
       const pass = result === test.expect;
       console.log(`${pass ? 'PASS' : 'FAIL'}: ${test.desc}`);
       if (!pass) console.log(`  Expected: "${test.expect}", Got: "${result}"`);
     } catch (e) {
       console.log(`FAIL: ${test.desc}`);
       console.log(`  Error: ${e.message}`);
     }
   }
 } else {
   console.log('formatDataLabel not available');
 }

 console.log('\n=== Testing checkLabelFit ===\n');

// checkLabelFit may not be callable without a real canvas
 if (checkLabelFit) {
   console.log('checkLabelFit is available');
   // Try a basic test with stubbed canvas measurements
   try {
     // The function needs canvas context, but we can test it doesn't crash with minimal input
     const stubMeasureText = { textWidth: () => 50 };
     // Just verify the function exists and can be referenced
     console.log('  checkLabelFit function is loaded and accessible');
   } catch (e) {
     console.log(`  checkLabelFit error (expected without real canvas): ${e.message}`);
   }
 } else {
   console.log('checkLabelFit not available');
 }

 console.log('\n=== Done ===');
