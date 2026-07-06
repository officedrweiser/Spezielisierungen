(function () {
  'use strict';

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var updateHeader = function () {
      if (window.scrollY > 12) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
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

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); }
    catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); } catch (e) {}
  }
  function showBanner() {
    if (banner) banner.classList.add('is-visible');
  }
  function hideBanner() {
    if (banner) banner.classList.remove('is-visible');
  }

  if (banner) {
    if (!getConsent()) {
      window.setTimeout(showBanner, 600);
    }

    var acceptBtn = document.getElementById('cookie-accept');
    var necessaryBtn = document.getElementById('cookie-necessary');
    var detailsToggle = document.getElementById('cookie-details-toggle');
    var details = document.getElementById('cookie-details');

    if (acceptBtn) acceptBtn.addEventListener('click', function () {
      setConsent({ necessary: true, statistics: true, ts: Date.now() });
      hideBanner();
    });
    if (necessaryBtn) necessaryBtn.addEventListener('click', function () {
      setConsent({ necessary: true, statistics: false, ts: Date.now() });
      hideBanner();
    });
    if (detailsToggle && details) detailsToggle.addEventListener('click', function () {
      var open = details.classList.toggle('is-open');
      detailsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.querySelectorAll('[data-open-cookie-settings]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
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

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
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
