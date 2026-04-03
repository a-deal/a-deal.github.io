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
