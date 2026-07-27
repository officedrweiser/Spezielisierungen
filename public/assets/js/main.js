(function () {
  'use strict';

  /* ---------- Hero-Diashow ---------- */
  var slideshow = document.getElementById('hero-slideshow');
  if (slideshow) {
    var slides = slideshow.querySelectorAll('.hero-slide');
    if (slides.length > 1) {
      var current = 0;
      window.setInterval(function () {
        slides[current].classList.remove('is-active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('is-active');
      }, 5000); // alle 5 Sekunden zum nächsten Bild
    }
  }

  /* ---------- Google-Bewertungen (rotierend) ---------- */
  var reviews = document.getElementById('reviews');
  if (reviews) {
    var rSlides = reviews.querySelectorAll('.review-slide');
    var dotsWrap = document.getElementById('reviews-dots');
    if (rSlides.length > 1) {
      var rIdx = 0;
      var rTimer;
      var dots = [];

      var goTo = function (n) {
        rSlides[rIdx].classList.remove('is-active');
        if (dots[rIdx]) dots[rIdx].classList.remove('is-active');
        rIdx = (n + rSlides.length) % rSlides.length;
        rSlides[rIdx].classList.add('is-active');
        if (dots[rIdx]) dots[rIdx].classList.add('is-active');
      };
      var startTimer = function () {
        rTimer = window.setInterval(function () { goTo(rIdx + 1); }, 7000);
      };
      var resetTimer = function () { window.clearInterval(rTimer); startTimer(); };

      if (dotsWrap) {
        rSlides.forEach(function (_, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('role', 'tab');
          b.setAttribute('aria-label', 'Bewertung ' + (i + 1));
          if (i === 0) b.classList.add('is-active');
          b.addEventListener('click', function () { goTo(i); resetTimer(); });
          dotsWrap.appendChild(b);
          dots.push(b);
        });
      }
      startTimer();
    }
  }

  /* ---------- Header scroll state + Zurück-nach-oben ---------- */
  var header = document.querySelector('.site-header');
  var backToTop = document.getElementById('back-to-top');

  var onWindowScroll = function () {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (backToTop) backToTop.classList.toggle('is-visible', y > window.innerHeight * 0.6);
  };
  onWindowScroll();
  window.addEventListener('scroll', onWindowScroll, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  var scrim = document.querySelector('.nav-scrim');

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.classList.remove('is-open');
    nav.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      if (scrim) scrim.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    if (scrim) scrim.addEventListener('click', closeNav);
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  // Inhalte sind ohne JavaScript immer sichtbar: erst JS selbst blendet sie
  // kurz aus, bevor sie beim Scrollen wieder eingeblendet werden. Prüfung via
  // scroll/resize-Events statt IntersectionObserver, da dieser bei sehr
  // schnellen bzw. sprunghaften Scroll-Bewegungen einzelne Elemente auslassen kann.
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (revealEls.length) {
    revealEls.forEach(function (el) { el.classList.add('reveal-pending'); });

    var ticking = false;
    var checkReveal = function () {
      var vh = window.innerHeight;
      revealEls = revealEls.filter(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.92 && rect.bottom > 0) {
          el.classList.remove('reveal-pending');
          el.classList.add('is-visible');
          return false;
        }
        return true;
      });
      ticking = false;
      if (!revealEls.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(checkReveal);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    checkReveal();
  }

  /* ---------- Cookie consent banner ---------- */
  var CONSENT_KEY = 'mw_cookie_consent';
  var banner = document.getElementById('cookie-banner');
  var cookieBackdrop = document.getElementById('cookie-backdrop');

  // Platzhalter-Kennungen: bitte durch die echten IDs aus Google Analytics /
  // Google Tag Manager ersetzen, sobald diese vorliegen. Solange hier ein
  // Platzhalter steht, wird bewusst kein Netzwerk-Request an Google ausgelöst.
  var GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  var GTM_CONTAINER_ID = 'GTM-XXXXXXX';

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); }
    catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); } catch (e) {}
    applyConsent(value);
  }
  function showBanner() {
    if (banner) banner.classList.add('is-visible');
    if (cookieBackdrop) cookieBackdrop.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }
  function hideBanner() {
    if (banner) banner.classList.remove('is-visible');
    if (cookieBackdrop) cookieBackdrop.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  var gaLoaded = false;
  function loadGoogleAnalytics() {
    if (gaLoaded) return;
    if (GA_MEASUREMENT_ID.indexOf('XXXX') !== -1) {
      console.log('[Cookie-Consent] Google Analytics zugelassen, aber noch keine echte Measurement-ID hinterlegt (main.js, GA_MEASUREMENT_ID).');
      return;
    }
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
    window.gtag = gtag;
  }

  var gtmLoaded = false;
  function loadGoogleTagManager() {
    if (gtmLoaded) return;
    if (GTM_CONTAINER_ID.indexOf('XXXX') !== -1) {
      console.log('[Cookie-Consent] Google Tag Manager zugelassen, aber noch keine echte Container-ID hinterlegt (main.js, GTM_CONTAINER_ID).');
      return;
    }
    gtmLoaded = true;
    (function (w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l !== 'dataLayer' ? '&l=' + l : '';
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', GTM_CONTAINER_ID);
  }

  function applyConsent(consent) {
    if (!consent) return;
    if (consent.analytics) loadGoogleAnalytics();
    if (consent.tag_manager) loadGoogleTagManager();
  }

  function setToggleStates(consent) {
    document.querySelectorAll('[data-cookie-category]').forEach(function (input) {
      var cat = input.getAttribute('data-cookie-category');
      input.checked = !!(consent && consent[cat]);
    });
  }

  if (banner) {
    var existingConsent = getConsent();
    if (!existingConsent) {
      // Sofort zeigen (keine Verzögerung): solange keine Zustimmung vorliegt,
      // soll die Website auf jeder Seite von Anfang an gesperrt sein.
      showBanner();
    } else {
      applyConsent(existingConsent);
    }
    setToggleStates(existingConsent);

    var acceptBtn = document.getElementById('cookie-accept');
    var rejectBtn = document.getElementById('cookie-reject');
    var saveBtn = document.getElementById('cookie-save');
    var settingsToggle = document.getElementById('cookie-details-toggle');
    var categoriesPanel = document.getElementById('cookie-categories');
    var saveRow = document.getElementById('cookie-save-row');

    function collapsePanel() {
      if (!settingsToggle || !categoriesPanel) return;
      categoriesPanel.setAttribute('hidden', '');
      if (saveRow) saveRow.setAttribute('hidden', '');
      settingsToggle.setAttribute('aria-expanded', 'false');
      settingsToggle.textContent = 'Einstellungen anzeigen';
      document.querySelectorAll('[data-cookie-disclosure]').forEach(function (btn) {
        btn.setAttribute('aria-expanded', 'false');
        var details = btn.closest('.cookie-category').querySelector('.cookie-category__details');
        if (details) details.classList.remove('is-open');
      });
    }

    if (acceptBtn) acceptBtn.addEventListener('click', function () {
      var consent = { necessary: true, analytics: true, tag_manager: true, ts: Date.now() };
      setConsent(consent);
      setToggleStates(consent);
      hideBanner();
      collapsePanel();
    });
    if (rejectBtn) rejectBtn.addEventListener('click', function () {
      var consent = { necessary: true, analytics: false, tag_manager: false, ts: Date.now() };
      setConsent(consent);
      setToggleStates(consent);
      hideBanner();
      collapsePanel();
    });
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var consent = { necessary: true, ts: Date.now() };
      document.querySelectorAll('[data-cookie-category]').forEach(function (input) {
        consent[input.getAttribute('data-cookie-category')] = input.checked;
      });
      setConsent(consent);
      hideBanner();
      collapsePanel();
    });
    if (settingsToggle && categoriesPanel) settingsToggle.addEventListener('click', function () {
      var willOpen = categoriesPanel.hasAttribute('hidden');
      if (willOpen) {
        categoriesPanel.removeAttribute('hidden');
        if (saveRow) saveRow.removeAttribute('hidden');
        settingsToggle.setAttribute('aria-expanded', 'true');
        settingsToggle.textContent = 'Einstellungen ausblenden';
      } else {
        categoriesPanel.setAttribute('hidden', '');
        if (saveRow) saveRow.setAttribute('hidden', '');
        settingsToggle.setAttribute('aria-expanded', 'false');
        settingsToggle.textContent = 'Einstellungen anzeigen';
      }
    });

    document.querySelectorAll('[data-cookie-disclosure]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var details = btn.closest('.cookie-category').querySelector('.cookie-category__details');
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (details) details.classList.toggle('is-open', !open);
      });
    });

    document.querySelectorAll('[data-open-cookie-settings]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        collapsePanel();
        setToggleStates(getConsent());
        showBanner();
      });
    });
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var statusBox = document.getElementById('form-status');
    var submitBtn = form.querySelector('button[type="submit"]');

    function setStatus(message, type) {
      if (!statusBox) return;
      statusBox.textContent = message;
      statusBox.className = 'form-status is-visible is-' + type;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (form.website && form.website.value) return; // honeypot

      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        topic: form.topic.value,
        message: form.message.value.trim(),
        privacy: form.privacy.checked
      };

      if (!data.name || !data.email || !data.message || !data.privacy) {
        setStatus('Bitte füllen Sie alle Pflichtfelder aus und bestätigen Sie die Datenschutzerklärung.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird gesendet …';
      setStatus('', '');
      statusBox.className = 'form-status';

      // Node-Server beantwortet /api/contact direkt. Auf klassischem
      // PHP-Webhosting ohne Rewrite-Regel greift der Fallback auf die
      // PHP-Variante desselben Endpunkts.
      function post(url) {
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }

      post('/api/contact')
        .then(function (res) {
          if (res.status === 404 || res.status === 405 || res.status === 501) {
            return post('/api/contact.php');
          }
          return res;
        })
        .then(function (res) {
          return res.text().then(function (raw) {
            var body = {};
            try { body = raw ? JSON.parse(raw) : {}; } catch (err) { /* keine JSON-Antwort */ }
            return { ok: res.ok, body: body };
          });
        })
        .then(function (result) {
          if (result.ok) {
            setStatus('Vielen Dank! Ihre Anfrage wurde übermittelt – wir melden uns so rasch wie möglich.', 'success');
            form.reset();
          } else {
            setStatus(result.body && result.body.error ? result.body.error : 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder rufen Sie uns an.', 'error');
          }
        })
        .catch(function () {
          setStatus('Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder rufen Sie uns an.', 'error');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Anfrage senden';
        });
    });
  }
})();
