/**
 * Critical CSS Extraction Script
 * 
 * This script extracts above-the-fold CSS for inlining in HTML <head>.
 * Run with: node extract-critical-css.js
 * 
 * Requires: puppeteer (npm install puppeteer)
 * 
 * For GitHub Pages deployment, you can run this locally and manually
 * copy the output to each HTML file, or use a build step.
 */

const fs = require('fs');
const path = require('path');

// Pages to extract critical CSS for
const pages = [
  { file: 'index.html', url: 'http://localhost:8080/index.html' },
  { file: 'about.html', url: 'http://localhost:8080/about.html' },
  { file: 'contact.html', url: 'http://localhost:8080/contact.html' },
  { file: 'case-study.html', url: 'http://localhost:8080/case-study.html?id=colead' },
  { file: 'services/business-development.html', url: 'http://localhost:8080/services/business-development.html' },
  { file: 'services/research-project-management.html', url: 'http://localhost:8080/services/research-project-management.html' },
  { file: 'services/data-division.html', url: 'http://localhost:8080/services/data-division.html' },
  { file: 'updates/index.html', url: 'http://localhost:8080/updates/index.html' },
];

async function extractCriticalCSS() {
  // Check if puppeteer is available
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.log('Puppeteer not installed. Install with: npm install puppeteer');
    console.log('Then run this script from the project root.');
    return;
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Set viewport to mobile first (covers most critical styles)
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true });

  for (const { file, url } of pages) {
    try {
      console.log(`Processing ${file}...`);
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for fonts and dynamic content
      await page.waitForTimeout(1000);
      
      // Get critical CSS using Penthouse-like approach
      const criticalCSS = await page.evaluate(() => {
        // Get all stylesheets
        const sheets = Array.from(document.styleSheets);
        let css = '';
        
        for (const sheet of sheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              css += rule.cssText + '\n';
            }
          } catch (e) {
            // Cross-origin stylesheets will throw - skip
          }
        }
        
        return css;
      });
      
      // Filter to only critical rules (simplified - in production use penthouse or critical)
      // This is a basic filter - for production, use the 'critical' npm package
      const lines = criticalCSS.split('\n');
      const criticalSelectors = [
        // Layout & reset
        '*', '*::before', '*::after',
        'html', 'body',
        '.container', '.section', '.section-head', '.rule',
        // Header
        '.site-header', '.brand', '.main-nav', '.nav-toggle',
        '.has-dropdown', '.dropdown-toggle', '.dropdown-panel',
        // Hero
        '.hero', '.hero-bg', '.hero-inner', '.hero-content',
        '.hero-eyebrow', '.hero-lede', '.scroll-cue',
        // Buttons
        '.btn', '.btn-gold', '.btn-outline', '.btn-dark',
        // Cards
        '.card', '.card-media', '.card-body', '.tag',
        // Grid
        '.grid', '.grid-3', '.grid-4',
        // Footer
        '.site-footer', '.footer-top', '.footer-brand', '.social-row',
        // Typography
        'h1', 'h2', 'h3', 'h4', 'p', 'a',
        // Utilities
        '.bg-navy', '.center', '.mt-0', '.skip-link',
        // Mobile
        '.mobile-cta-bar',
        // Logo marquee
        '.logo-marquee-wrapper', '.logo-marquee', '.logo-item', '.marquee-arrow',
        // Data division toggle
        '.dd-view-toggle', '.dd-view-btn',
        // Animations
        '@keyframes', '@media'
      ];
      
      const filtered = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // Keep media queries and keyframes
        if (trimmed.startsWith('@media') || trimmed.startsWith('@keyframes')) return true;
        // Keep rules that match critical selectors
        return criticalSelectors.some(sel => {
          if (sel.startsWith('@')) return false;
          // Match selector at start of rule
          const ruleMatch = trimmed.match(/^([^{]+)\{/);
          if (!ruleMatch) return false;
          const ruleSelectors = ruleMatch[1].split(',').map(s => s.trim());
          return ruleSelectors.some(rs => criticalSelectors.some(cs => rs.includes(cs.replace('.', '').replace('*', ''))));
        });
      });
      
      const outputDir = path.join(__dirname, 'critical-css');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      
      const outputFile = path.join(outputDir, file.replace('.html', '-critical.css'));
      fs.writeFileSync(outputFile, filtered.join('\n'));
      console.log(`  ✓ Saved to ${outputFile} (${filtered.length} rules)`);
      
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err.message);
    }
  }
  
  await browser.close();
  console.log('\nDone! Critical CSS files saved to ./critical-css/');
  console.log('To inline: copy content of each .css file into <style> in <head> of corresponding HTML');
}

// Run if called directly
if (require.main === module) {
  extractCriticalCSS().catch(console.error);
}

module.exports = { extractCriticalCSS };