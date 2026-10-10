// Prüfung im echten Browser (Chromium über Playwright) gegen einen LOKALEN Testserver.
// Aufruf: NODE_PATH=/opt/node22/lib/node_modules node browser_check.js http://localhost:3100
// Prüft: Datenübertragung an Dritte ohne Zustimmung, Cookie-Sperre (Maus, Tastatur,
// Scrollen, Datenschutz-Tab, erneut geöffnete Einstellungen, mehrere Tabs) und nach der
// Zustimmung: Konsolenfehler/CSP-Blockaden, Schriften vom eigenen Server, Formular, Handy-Menü.
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:3100').replace(/\/$/, '');
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const CONSENT_KEY = process.env.CONSENT_KEY || 'mw_cookie_consent';
const PAGES = ['/', '/ueber-uns.html', '/leistungen.html', '/kontakt.html', '/impressum.html', '/datenschutz.html'];
let findings = 0;
const ok = (t) => console.log('  [ok] ' + t);
const bad = (t) => { findings++; console.log('  [!] ' + t); };
const info = (t) => console.log('  [i] ' + t);

const lockState = (pg) => pg.evaluate(() => {
  const b = document.getElementById('cookie-banner');
  const main = document.querySelector('main');
  const link = [...document.querySelectorAll('a[href]')].find(a => a.offsetParent && !a.closest('#cookie-banner'));
  let clickable = null;
  if (link) { const r = link.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); clickable = !!top && (top === link || link.contains(top)); }
  return { banner: !!b && b.classList.contains('is-visible'), inert: !!main && main.hasAttribute('inert'), linkClickable: clickable, scrollY: Math.round(scrollY) };
});
async function tabReachesPage(pg, presses = 20) {
  for (let i = 0; i < presses; i++) {
    await pg.keyboard.press('Tab');
    // BODY = Fokus ist in der Browser-Adresszeile, kein Seitenelement -> unkritisch
    const leak = await pg.evaluate(() => { const a = document.activeElement; return a && a !== document.body && !a.closest('#cookie-banner') ? (a.textContent || a.tagName).trim().slice(0, 30) : null; });
    if (leak) return leak;
  }
  return null;
}
async function assertLocked(pg, label) {
  const s = await lockState(pg);
  if (!s.banner) return bad(`${label}: Cookie-Fenster NICHT sichtbar – Seite frei benutzbar`);
  if (s.linkClickable) bad(`${label}: Links hinter dem Fenster anklickbar`);
  if (!s.inert) bad(`${label}: Seite nicht deaktiviert (inert fehlt)`);
  const leak = await tabReachesPage(pg);
  if (leak) bad(`${label}: Tabulator-Taste erreicht Seitenelement „${leak}“`);
  await pg.mouse.wheel(0, 1500); await pg.waitForTimeout(300);
  const y = (await lockState(pg)).scrollY;
  if (y > 0) bad(`${label}: Seite lässt sich scrollen (scrollY ${y})`);
  if (s.banner && !s.linkClickable && s.inert && !leak && y === 0) ok(`${label}: gesperrt (Maus, Tastatur, Scrollen)`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });

  console.log('== 1. Datenübertragung an Dritte OHNE Zustimmung');
  for (const path of PAGES) {
    const ctx = await browser.newContext(); const pg = await ctx.newPage(); const hosts = new Set();
    pg.on('request', r => { const h = new URL(r.url()).host; if (!r.url().startsWith(BASE)) hosts.add(h); });
    try { await pg.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 }); await pg.waitForTimeout(800); } catch (e) { info(`${path}: ${e.message.slice(0, 80)}`); }
    hosts.size ? bad(`${path}: kontaktiert ohne Zustimmung ${[...hosts].join(', ')}`) : ok(`${path}: nur eigener Server`);
    await ctx.close();
  }

  console.log('\n== 2. Cookie-Sperre');
  for (const [w, h, tag] of [[1440, 900, 'Computer'], [390, 844, 'Handy']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
    await assertLocked(p, `${tag} – Erstbesuch Startseite`);
    const privacyLink = await p.$('#cookie-banner a[href*="datenschutz"]');
    if (privacyLink) {
      const [t] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), privacyLink.click()]);
      const tabPg = t || p;
      await tabPg.waitForLoadState('networkidle'); await tabPg.waitForTimeout(300);
      await assertLocked(tabPg, `${tag} – Datenschutz-Link aus dem Fenster${t ? ' (neuer Tab)' : ' (selber Tab)'}`);
      await tabPg.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      if (!(await lockState(tabPg)).banner) bad(`${tag}: nach „Zurück“ (Seite aus Speicher) frei`); else ok(`${tag}: „Zurück“ (Seite aus Speicher) bleibt gesperrt`);
      // Entscheidung im zweiten Tab -> erster Tab frei?
      if (t) {
        await t.click('#cookie-reject'); await p.waitForTimeout(600);
        (await lockState(p)).banner ? bad(`${tag}: Entscheidung im Datenschutz-Tab gibt ursprünglichen Tab nicht frei`) : ok(`${tag}: Entscheidung in einem Tab gibt alle Tabs frei`);
      }
    } else info('Kein Datenschutz-Link im Cookie-Fenster gefunden');
    // Einstellungen erneut öffnen -> bis zur Entscheidung gesperrt, auch in neuen Tabs
    const reopen = await p.$('[data-open-cookie-settings]');
    if (reopen) {
      await p.evaluate(() => document.querySelector('[data-open-cookie-settings]').click()); await p.waitForTimeout(300);
      const t2 = await ctx.newPage(); await t2.goto(BASE + '/leistungen.html', { waitUntil: 'networkidle' }); await t2.waitForTimeout(300);
      (await lockState(t2)).banner ? ok(`${tag}: nach erneutem Öffnen der Einstellungen auch neue Tabs gesperrt`) : bad(`${tag}: nach erneutem Öffnen der Einstellungen ist ein neuer Tab frei`);
      await t2.click('#cookie-accept'); await p.waitForTimeout(500);
      (await lockState(p)).banner ? bad(`${tag}: nach „Akzeptieren“ weiterhin gesperrt`) : ok(`${tag}: nach Entscheidung frei`);
    }
    await ctx.close();
  }

  console.log('\n== 3. Nach Zustimmung: Fehler, Blockaden, Schriften, Funktionen');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((k) => { try { localStorage.setItem(k, JSON.stringify({ necessary: true, analytics: false, tag_manager: false, ts: Date.now() })); } catch (e) {} }, CONSENT_KEY);
  for (const path of PAGES) {
    const pg = await ctx.newPage(); const errs = [];
    pg.on('console', m => { if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text())) errs.push(m.text().slice(0, 140)); });
    pg.on('pageerror', e => errs.push('JS: ' + e.message.slice(0, 140)));
    await pg.goto(BASE + path, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    const fonts = await pg.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')); });
    const csp = errs.filter(e => /Content Security Policy|Refused to/i.test(e));
    if (csp.length) bad(`${path}: CSP blockiert: ${csp[0]}`);
    else if (errs.length) bad(`${path}: Konsolenfehler: ${errs[0]}`);
    else ok(`${path}: keine Fehler, Schriften: ${[...new Set(fonts)].join(', ') || 'keine Webfonts'}`);
    if (path === '/kontakt.html' && await pg.$('#contact-form')) {
      await pg.fill('#name', 'Browser Test'); await pg.fill('#email', 'test@example.com');
      if (await pg.$('#topic')) await pg.selectOption('#topic', { index: 1 });
      await pg.fill('#message', 'Test aus dem Sicherheits-Check'); await pg.check('#privacy');
      await pg.click('#contact-form button[type=submit]'); await pg.waitForTimeout(2000);
      const msg = (await pg.textContent('#form-status') || '').trim();
      /Vielen Dank/.test(msg) ? ok('Kontaktformular im Browser: ' + msg.slice(0, 60)) : bad('Kontaktformular im Browser: ' + (msg || 'keine Rückmeldung'));
    }
    await pg.close();
  }
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await m.addInitScript((k) => { try { localStorage.setItem(k, JSON.stringify({ necessary: true, ts: Date.now() })); } catch (e) {} }, CONSENT_KEY);
  const mp = await m.newPage(); await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  if (await mp.$('#nav-toggle')) { await mp.click('#nav-toggle'); await mp.waitForTimeout(400);
    (await mp.evaluate(() => document.getElementById('main-nav').classList.contains('is-open'))) ? ok('Handy-Menü öffnet') : bad('Handy-Menü öffnet nicht'); }
  const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
  sw > 390 ? bad(`Handy: Seite breiter als Bildschirm (${sw}px)`) : ok('Handy: kein seitliches Verrutschen');
  await m.close();
  await browser.close();
  console.log(`\nErgebnis: ${findings} Auffälligkeiten`);
  process.exit(findings ? 1 : 0);
})().catch(e => { console.error('Abbruch:', e.message); process.exit(2); });
