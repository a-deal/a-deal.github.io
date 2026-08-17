import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const ROOT = import.meta.dirname;
const INDEX_PATH = path.join(ROOT, 'index.html');
const ARTICLE_PATH = path.join(
  ROOT,
  'writing',
  'hardware-is-eating-the-world',
  'index.html',
);

let html;
let document;

beforeAll(() => {
  html = fs.readFileSync(INDEX_PATH, 'utf8');
  document = new JSDOM(html, { url: 'https://andrewdeal.info/' }).window.document;
});

describe('public homepage', () => {
  it('publishes the current positioning', () => {
    expect(document.title).toBe('Andrew Deal | Physical AI and Real-World Systems');
    const heading = document.querySelector('h1');
    const headingText = heading?.innerHTML
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    expect(headingText).toBe('The future has weight');
    expect(html).toContain('Software for machines, energy, and the real world.');
  });

  it('uses the current industrial-frontier hero asset', () => {
    const heroAsset = 'industrial-frontier-hero-v7.webp';
    expect(html).toContain(`url('/${heroAsset}')`);
    expect(fs.existsSync(path.join(ROOT, heroAsset))).toBe(true);
  });

  it('exposes the credential sheet and public profile links', () => {
    const links = [...document.querySelectorAll('a')].map((link) => link.href);

    expect(links).toContain('https://andrewdeal.info/Andrew_Deal_Credential_Sheet.pdf');
    expect(links).toContain('https://www.linkedin.com/in/adeal/');
    expect(links).toContain('https://github.com/a-deal');
    expect(links).toContain('https://x.com/a_e_deal');
    expect(links).toContain('mailto:deal.e.andrew@gmail.com');
  });

  it('links to the published field note and current writing home', () => {
    const links = [...document.querySelectorAll('a')].map((link) => link.href);

    expect(links).toContain(
      'https://andrewdeal.info/writing/hardware-is-eating-the-world/',
    );
    expect(links).toContain('https://notesonatoms.substack.com/');
    expect(
      document.querySelector('a[aria-label="Notes on Atoms"]')?.href,
    ).toBe('https://notesonatoms.substack.com/');
  });

  it('keeps every root-relative homepage asset resolvable', () => {
    const assetPaths = new Set([
      ...[...html.matchAll(/(?:href|src)=["']\/([^"'?#]+)["']/g)].map((match) => match[1]),
      ...[...html.matchAll(/url\(["']?\/([^"')?#]+)["']?\)/g)].map((match) => match[1]),
    ]);

    expect(assetPaths.size).toBeGreaterThan(0);
    for (const assetPath of assetPaths) {
      expect(fs.existsSync(path.join(ROOT, assetPath)), `missing /${assetPath}`).toBe(true);
    }
  });
});

describe('machine-readable profile', () => {
  it('publishes valid Person structured data', () => {
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const profile = JSON.parse(script.textContent);
    expect(profile['@type']).toBe('Person');
    expect(profile.name).toBe('Andrew Deal');
    expect(profile.url).toBe('https://andrewdeal.info/');
    expect(profile.subjectOf.url).toBe(
      'https://andrewdeal.info/Andrew_Deal_Credential_Sheet.pdf',
    );
  });

  it.each(['profile.md', 'llms.txt', 'robots.txt', 'sitemap.xml', 'rss.xml'])(
    'ships %s for discovery',
    (filename) => {
      expect(fs.existsSync(path.join(ROOT, filename))).toBe(true);
      expect(fs.statSync(path.join(ROOT, filename)).size).toBeGreaterThan(0);
    },
  );
});

describe('Hardware Is Eating the World', () => {
  let articleHtml;
  let articleDocument;

  beforeAll(() => {
    articleHtml = fs.readFileSync(ARTICLE_PATH, 'utf8');
    articleDocument = new JSDOM(articleHtml, {
      url: 'https://andrewdeal.info/writing/hardware-is-eating-the-world/',
    }).window.document;
  });

  it('publishes a canonical, machine-readable article', () => {
    expect(articleDocument.title).toBe('Hardware Is Eating the World | Andrew Deal');
    expect(articleDocument.querySelector('h1')?.textContent).toContain(
      'Hardware Is Eating the World',
    );
    expect(articleDocument.querySelector('link[rel="canonical"]')?.href).toBe(
      'https://andrewdeal.info/writing/hardware-is-eating-the-world/',
    );

    const script = articleDocument.querySelector('script[type="application/ld+json"]');
    const article = JSON.parse(script.textContent);
    expect(article['@type']).toBe('Article');
    expect(article.author.name).toBe('Andrew Deal');
    expect(article.datePublished).toBe('2026-08-16');
  });

  it('ships its source article and resolves local assets', () => {
    const markdownPath = path.join(
      ROOT,
      'writing',
      'hardware-is-eating-the-world',
      'index.md',
    );
    expect(fs.existsSync(markdownPath)).toBe(true);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('# Hardware Is Eating the World');

    const assetPaths = new Set([
      ...[...articleHtml.matchAll(/(?:href|src)=["']\/([^"'?#]+)["']/g)].map(
        (match) => match[1],
      ),
      ...[...articleHtml.matchAll(/url\(["']?\/([^"')?#]+)["']?\)/g)].map(
        (match) => match[1],
      ),
    ]);

    for (const assetPath of assetPaths) {
      expect(fs.existsSync(path.join(ROOT, assetPath)), `missing /${assetPath}`).toBe(true);
    }
  });

  it('is present in discovery files', () => {
    const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const rss = fs.readFileSync(path.join(ROOT, 'rss.xml'), 'utf8');
    const canonical = 'https://andrewdeal.info/writing/hardware-is-eating-the-world/';

    expect(sitemap).toContain(canonical);
    expect(rss).toContain(canonical);
  });
});
