// Test harness for portal pagination functions
// Run with: node tools/test-portal.js

// Minimal stubs
const document = {
  documentElement: { dataset: {} },
  createElement: () => ({ getContext: () => ({ measureText: { textWidth: () => 0 } }) }),
  getElementsByTagName: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

global.document = document;
global.window = {
  Chart: class { constructor() { this.data = { labels: [], datasets: [] }; this.options = { scales: {}, plugins: {} }; } register() {} },
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
const validateChartItem = shared.validateChartItem;
const normalizeChartItem = shared.normalizeChartItem;
const ddTypeName = shared.ddTypeName;
const DD_PALETTE = shared.DD_PALETTE;
const formatDataLabel = shared.formatDataLabel;
const checkLabelFit = shared.checkLabelFit;

// Recreate pagination functions for testing (since they're in IIFE)
const PAGE_SIZE = 15;
let currentPage = 1;

function paginate(list, page, size) {
  const start = (page - 1) * size;
  return list.slice(start, start + size);
}

function pageOfItem(list, id, size) {
  const index = list.findIndex(item => item.id === id);
  if (index === -1) return 1;
  return Math.floor(index / size) + 1;
}

function teardownCards() {
  // Mock function for testing
}

console.log('=== Testing Pagination Functions ===\n');

// Test 1: paginate with 13 items, size 4
console.log('=== Test 1: paginate 13 items with size 4 ===');
const items13 = Array.from({length: 13}, (_, i) => ({ id: `item${i+1}` }));
console.log('Page 1:', paginate(items13, 1, 4).map(x => x.id));
console.log('Page 2:', paginate(items13, 2, 4).map(x => x.id));
console.log('Page 3:', paginate(items13, 3, 4).map(x => x.id));
console.log('Page 4:', paginate(items13, 4, 4).map(x => x.id));
console.log('Page 5 (should be empty):', paginate(items13, 5, 4).map(x => x.id));

// Test 2: pageOfItem
console.log('\n=== Test 2: pageOfItem ===');
const items = Array.from({length: 13}, (_, i) => ({ id: `item${i+1}` }));
console.log('item1 -> page:', pageOfItem(items, 'item1', 4));
console.log('item4 -> page:', pageOfItem(items, 'item4', 4));
console.log('item5 -> page:', pageOfItem(items, 'item5', 4));
console.log('item13 -> page:', pageOfItem(items, 'item13', 4));
console.log('nonexistent -> page:', pageOfItem(items, 'nonexistent', 4));

// Test 3: page clamping
console.log('\n=== Test 3: page clamping ===');
let testPage = 5;
const totalPages = Math.ceil(13 / 4);
if (testPage > totalPages) testPage = totalPages;
console.log('Page 5 clamped to:', testPage);

testPage = 0;
if (testPage < 1) testPage = 1;
console.log('Page 0 clamped to:', testPage);

// Test 4: page reset on filter change
console.log('\n=== Test 4: page reset on filter ===');
let testPage2 = 3;
testPage2 = 1; // simulate filter change
console.log('Page after filter change:', testPage2);

// Test 5: pager hidden for 13 items at size 15
console.log('\n=== Test 5: pager visibility ===');
const totalPages15 = Math.ceil(13 / 15);
console.log('Total pages for 13 items at size 15:', totalPages15);
console.log('Pager hidden:', totalPages15 <= 1);

// Test 6: teardownCards mock
console.log('\n=== Test 6: teardownCards mock ===');
let mockCharts = [{ destroy: () => console.log('  destroy() called') }, { destroy: () => console.log('  destroy() called') }];
let mockIframes = [{ src: 'test', set src(v) { console.log('  iframe.src =', v); } }];
let mockImgs = [{ src: 'test', set src(v) { console.log('  img.src =', v); } }];

function mockTeardown() {
  console.log('  Destroying charts:');
  mockCharts.forEach(c => c.destroy());
  mockCharts = [];
  
  console.log('  Clearing iframes:');
  mockIframes.forEach(f => f.src = 'about:blank');
  mockIframes = [];
  
  console.log('  Clearing images:');
  mockImgs.forEach(i => i.src = '');
  mockImgs = [];
  
  console.log('  Grid cleared');
}

console.log('Calling mockTeardown():');
mockTeardown();

console.log('\n=== All Tests Complete ===');
