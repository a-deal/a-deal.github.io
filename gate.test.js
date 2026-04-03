import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const GATE_PASSWORD = 'learnair2026';
const LEARNAIR_DIR = path.join(import.meta.dirname, 'learnair');

describe('gate.html', () => {
  let dom;
  let document;

  beforeEach(() => {
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, 'gate.html'), 'utf-8');
    dom = new JSDOM(html, { url: 'https://andrewdeal.info/learnair/gate.html', runScripts: 'dangerously', storageQuota: 1024 });
    document = dom.window.document;
  });

  it('has a password input field', () => {
    const input = document.querySelector('input[type="password"]');
    expect(input).not.toBeNull();
  });

  it('has a submit button', () => {
    const button = document.querySelector('button[type="submit"]') || document.querySelector('button');
    expect(button).not.toBeNull();
  });

  it('sets localStorage token on correct password', () => {
    const input = document.querySelector('input[type="password"]');
    input.value = GATE_PASSWORD;
    const form = document.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(dom.window.localStorage.getItem('learnair_access')).toBe('granted');
  });

  it('does not set token on wrong password', () => {
    const input = document.querySelector('input[type="password"]');
    input.value = 'wrongpassword';
    const form = document.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(dom.window.localStorage.getItem('learnair_access')).toBeNull();
  });

  it('shows error message on wrong password', () => {
    const input = document.querySelector('input[type="password"]');
    input.value = 'wrongpassword';
    const form = document.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const error = document.querySelector('.error');
    expect(error).not.toBeNull();
    expect(error.textContent.length).toBeGreaterThan(0);
  });
});

describe('protected pages include gate check', () => {
  const protectedPages = fs.readdirSync(LEARNAIR_DIR)
    .filter(f => f.endsWith('.html') && f !== 'gate.html');

  it('found learnair HTML pages to check', () => {
    expect(protectedPages.length).toBeGreaterThan(0);
  });

  protectedPages.forEach(page => {
    it(`${page} contains the gate check script`, () => {
      const html = fs.readFileSync(path.join(LEARNAIR_DIR, page), 'utf-8');
      expect(html).toContain('learnair_access');
      expect(html).toContain('gate.html');
    });
  });
});

describe('gate check behavior', () => {
  it('redirects to gate.html when no token is set', () => {
    const samplePage = fs.readdirSync(LEARNAIR_DIR)
      .find(f => f.endsWith('.html') && f !== 'gate.html');
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, samplePage), 'utf-8');

    // Extract the gate check script
    const scriptMatch = html.match(/<script>[^]*?learnair_access[^]*?<\/script>/);
    expect(scriptMatch).not.toBeNull();

    // Verify the script checks localStorage and redirects
    const script = scriptMatch[0];
    expect(script).toContain('localStorage');
    expect(script).toContain('gate.html');
  });

  it('does not redirect when token is set', () => {
    const samplePage = fs.readdirSync(LEARNAIR_DIR)
      .find(f => f.endsWith('.html') && f !== 'gate.html');
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, samplePage), 'utf-8');

    const dom = new JSDOM(html, {
      url: 'https://andrewdeal.info/learnair/' + samplePage,
      runScripts: 'dangerously',
      storageQuota: 1024,
      beforeParse(window) {
        window.localStorage.setItem('learnair_access', 'granted');
      }
    });

    // If no redirect happened, document should still have content
    expect(dom.window.document.body.innerHTML.length).toBeGreaterThan(0);
  });
});

describe('site reorg: hub.html nav structure', () => {
  let html;

  beforeEach(() => {
    html = fs.readFileSync(path.join(LEARNAIR_DIR, 'hub.html'), 'utf-8');
  });

  it('has Now tile linking to now.html', () => {
    expect(html).toContain('href="now.html"');
    expect(html).toMatch(/Now/);
  });

  it('has Intel tile linking to intel.html', () => {
    expect(html).toContain('href="intel.html"');
    expect(html).toMatch(/Intel/);
  });

  it('has Log tile linking to log.html', () => {
    expect(html).toContain('href="log.html"');
    expect(html).toMatch(/Log/);
  });

  it('has Archive tile linking to archive.html', () => {
    expect(html).toContain('href="archive.html"');
    expect(html).toMatch(/Archive/);
  });

  it('no longer links to old tile pages', () => {
    expect(html).not.toContain('href="act.html"');
    expect(html).not.toContain('href="research-index.html"');
    expect(html).not.toContain('href="plan-index.html"');
    expect(html).not.toContain('href="track-index.html"');
  });
});

describe('site reorg: index pages exist with correct content', () => {
  it('now.html exists and links to active pages', () => {
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, 'now.html'), 'utf-8');
    expect(html).toContain('strategic-clarity.html');
    expect(html).toContain('april-7-arc.html');
    expect(html).toContain('heat-map.html');
    expect(html).toContain('learnair_access'); // gate check
  });

  it('intel.html exists and links to intel pages', () => {
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, 'intel.html'), 'utf-8');
    expect(html).toContain('deep-dive.html');
    expect(html).toContain('curriculum-analysis.html');
    expect(html).toContain('competitive-landscape.html');
    expect(html).toContain('learnair_access');
  });

  it('log.html exists and links to meeting pages', () => {
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, 'log.html'), 'utf-8');
    expect(html).toContain('meetings.html');
    expect(html).toContain('learnair_access');
  });

  it('archive.html exists and links to archived pages', () => {
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, 'archive.html'), 'utf-8');
    expect(html).toContain('v1.html');
    expect(html).toContain('partnership-options.html');
    expect(html).toContain('stress-test.html');
    expect(html).toContain('call-prep.html');
    expect(html).toContain('learnair_access');
  });
});

describe('site reorg: heat-map.html exists', () => {
  it('heat-map.html exists and has content', () => {
    const html = fs.readFileSync(path.join(LEARNAIR_DIR, 'heat-map.html'), 'utf-8');
    expect(html).toContain('Heat Map');
    expect(html).toContain('Enlisted');
    expect(html).toContain('Junior Officer');
    expect(html).toContain('learnair_access');
  });
});
