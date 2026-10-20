/* =========================================================
   Portfolio — Asma Ajmi | interactions
   Thème clair/sombre · i18n FR/EN/AR (RTL) · navigation · animations · filtres · chatbot IA
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var I18N = window.PORTFOLIO_I18N;
  var THEME_KEY = 'aa-theme-pref';
  var LANG_KEY = 'aa-language';
  var ACCENT_KEY = 'aa-accent';
  var CHAT_KEY = 'aa-chat-history';
  var ACCENTS = ['jade', 'violet', 'ocean'];
  var EMAIL = 'asmaajmi237@gmail.com';
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function storageGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function storageSet(store, key, value) { try { store.setItem(key, value); } catch (e) { /* stockage indisponible */ } }
  function storageRemove(store, key) { try { store.removeItem(key); } catch (e) { /* stockage indisponible */ } }

  /* ---------- Langues : FR / EN / AR ---------- */
  var currentLang = I18N.languages.indexOf(root.lang) !== -1 ? root.lang : I18N.defaultLanguage;

  function t(key, vars) {
    var dict = I18N.dictionaries[currentLang] || I18N.dictionaries[I18N.defaultLanguage];
    var value = dict[key] !== undefined ? dict[key] : I18N.dictionaries[I18N.defaultLanguage][key];
    if (value === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (name) { value = value.split('{' + name + '}').join(String(vars[name])); });
    }
    return value;
  }

  function applyTranslations(lang) {
    if (I18N.languages.indexOf(lang) === -1) lang = I18N.defaultLanguage;
    currentLang = lang;
    root.lang = lang;
    root.dir = I18N.rtl.indexOf(lang) !== -1 ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      var key = node.getAttribute('data-i18n');
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') node.placeholder = t(key);
      else node.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (node) {
      node.innerHTML = t(node.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (node) {
      node.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        if (parts.length === 2) node.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    updateThemeButton();
    updateBurgerLabel();
    document.dispatchEvent(new CustomEvent('portfolio:language', { detail: { lang: lang } }));
  }

  document.querySelectorAll('.lang-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      var lang = button.getAttribute('data-lang');
      storageSet(localStorage, LANG_KEY, lang);
      applyTranslations(lang);
    });
  });

  /* ---------- Thème clair / sombre ---------- */
  var themeToggle = document.getElementById('themeToggle');
  var systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function currentTheme() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function updateThemeButton() {
    if (!themeToggle) return;
    var dark = currentTheme() === 'dark';
    themeToggle.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark'));
    themeToggle.setAttribute('title', t(dark ? 'themeToLight' : 'themeToDark'));
  }

  // La barre d'adresse mobile suit le thème choisi, pas seulement celui du système.
  function syncThemeColor() {
    var bg = window.getComputedStyle(root).getPropertyValue('--bg').trim();
    if (!bg) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) { meta.setAttribute('content', bg); });
  }

  function softTransition() {
    root.classList.add('theme-transition');
    window.setTimeout(function () { root.classList.remove('theme-transition'); }, 400);
  }

  /* origin : point de départ {x, y} de la révélation circulaire (View Transitions), sinon fondu simple. */
  function setTheme(theme, animate, origin) {
    var apply = function () {
      root.setAttribute('data-theme', theme);
      updateThemeButton();
      syncThemeColor();
    };
    if (animate && origin && !reducedMotion && document.startViewTransition) {
      var transition = document.startViewTransition(apply);
      transition.ready.then(function () {
        var radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
        var at = ' at ' + origin.x + 'px ' + origin.y + 'px)';
        root.animate({ clipPath: ['circle(0px' + at, 'circle(' + radius + 'px' + at] },
          { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () { /* transition annulée : le thème est quand même appliqué */ });
      return;
    }
    if (animate) softTransition();
    apply();
  }

  function centerOf(el) {
    var box = el.getBoundingClientRect();
    return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
  }

  /* pref : 'light' | 'dark' | 'system' */
  function chooseTheme(pref, origin) {
    if (pref === 'system') {
      storageRemove(localStorage, THEME_KEY);
      pref = systemDark && systemDark.matches ? 'dark' : 'light';
    } else {
      storageSet(localStorage, THEME_KEY, pref);
    }
    if (pref !== currentTheme()) setTheme(pref, true, origin);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      chooseTheme(currentTheme() === 'dark' ? 'light' : 'dark', centerOf(themeToggle));
    });
  }

  /* ---------- Couleur d'accent (jade / violet / océan) ---------- */
  function currentAccent() {
    var accent = root.getAttribute('data-accent');
    return ACCENTS.indexOf(accent) !== -1 ? accent : ACCENTS[0];
  }
  function setAccent(accent) {
    if (ACCENTS.indexOf(accent) === -1) return;
    storageSet(localStorage, ACCENT_KEY, accent);
    softTransition();
    root.setAttribute('data-accent', accent);
  }

  // Sans préférence enregistrée, suivre le thème du système en direct.
  if (systemDark) {
    var onSystemChange = function (e) {
      var saved = storageGet(localStorage, THEME_KEY);
      if (saved !== 'light' && saved !== 'dark') setTheme(e.matches ? 'dark' : 'light', true);
    };
    if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
    else if (systemDark.addListener) systemDark.addListener(onSystemChange);
  }

  /* ---------- Menu mobile ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function updateBurgerLabel() {
    if (!burger) return;
    burger.setAttribute('aria-label', t(burger.getAttribute('aria-expanded') === 'true' ? 'menuClose' : 'menuOpen'));
  }

  function setNav(open) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    updateBurgerLabel();
  }

  if (burger && nav) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); burger.focus(); }
    });
  }

  /* ---------- Header : ombre + barre de progression ---------- */
  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');
  var ticking = false;

  /* Rattrapage : un saut d'ancre peut faire passer un élément sous le viewport
     puis au-dessus sans qu'IntersectionObserver ne franchisse de seuil. */
  function sweepSkippedReveals() {
    var pending = document.querySelectorAll('.reveal:not(.is-in)');
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].getBoundingClientRect().bottom < 0) pending[i].classList.add('is-in');
    }
  }

  function onScroll() {
    sweepSkippedReveals();
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('is-stuck', y > 4);
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (toTop) toTop.classList.toggle('is-visible', y > 500);
    if (typeof updateParallax === 'function') updateParallax(y);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var brand = document.querySelector('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  /* ---------- Lien de navigation actif (scroll spy) ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute('id');
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + id;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Apparition au défilement ---------- */
  // Variante d'entrée par type de bloc (les directions latérales suivent le sens de lecture via --dir).
  var REVEAL_VARIANTS = {
    '.profil-text': 'left', '.code-card': 'right', '.tl-item': 'left', '.p-card': 'zoom',
    '.edu-card': 'zoom', '.c-card': 'zoom', '.pillars li': 'zoom', '.skill-card': 'up', '.contact-cta': 'up'
  };

  /* ---------- Cartes projet : 5 tags visibles + « +N » (liste complète dans le détail) ---------- */
  var TAG_LIMIT = 5;
  document.querySelectorAll('.p-card .tags').forEach(function (box) {
    var tags = box.querySelectorAll('span');
    if (tags.length <= TAG_LIMIT + 1) return;
    for (var i = TAG_LIMIT; i < tags.length; i++) tags[i].classList.add('is-extra');
    var more = document.createElement('span');
    more.className = 'tag-more';
    more.setAttribute('aria-hidden', 'true');
    more.textContent = '+' + (tags.length - TAG_LIMIT);
    box.appendChild(more);
  });
  Object.keys(REVEAL_VARIANTS).forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', REVEAL_VARIANTS[selector]);
    });
  });

  // Cascade : délai croissant entre frères d'une même rangée, indices pour les éléments internes.
  var STAGGER_GROUPS = ['.pillars', '.skills', '.projects', '.edu', '.contact-grid', '.langs'];
  STAGGER_GROUPS.forEach(function (selector) {
    var parent = document.querySelector(selector);
    if (!parent) return;
    Array.prototype.forEach.call(parent.children, function (child, i) {
      child.style.setProperty('--d', (i % 4) * 90 + 'ms');
    });
  });
  ['.tech-grid li', '.pills li', '.tags span', '.bullets li'].forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (el) {
      var index = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty('--i', Math.min(index, 12));
    });
  });

  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window && revealables.length && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        var el = entry.target;
        // Élément déjà dépassé (lien d'ancre, restauration du scroll) : afficher sans animation.
        if (!entry.isIntersecting) {
          if (entry.boundingClientRect.bottom < 0) { el.style.setProperty('--d', '0ms'); el.classList.add('is-in'); obs.unobserve(el); }
          return;
        }
        el.classList.add('is-in');
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Compteurs du hero (5, 6+, 3, 3+) ---------- */
  document.querySelectorAll('.hero-stats b').forEach(function (el) {
    var match = el.textContent.trim().match(/^(\d+)(\D*)$/);
    if (!match || reducedMotion) return;
    var target = Number(match[1]), suffix = match[2], start = null, done = false;
    var finish = function () { done = true; el.textContent = target + suffix; };
    el.textContent = '0' + suffix;
    function step(now) {
      if (done) return;
      if (start === null) start = now;
      var p = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) window.requestAnimationFrame(step); else done = true;
    }
    window.setTimeout(function () { window.requestAnimationFrame(step); }, 500);
    // Onglet ouvert en arrière-plan : les frames d'animation sont suspendues → afficher la valeur finale quand même.
    window.setTimeout(function () { if (!done) finish(); }, 3000);
  });

  /* ---------- Parallaxe au défilement (hero + captures de projets) ---------- */
  var parallaxGlow = document.querySelector('.hero-glow');
  var parallaxPhoto = document.querySelector('.hero-photo');
  var projectShots = Array.prototype.slice.call(document.querySelectorAll('.p-window'));

  function updateParallax(y) {
    if (reducedMotion) return;
    var vh = window.innerHeight;
    if (y < vh * 1.2) {
      if (parallaxGlow) parallaxGlow.style.translate = '0 ' + (y * 0.18).toFixed(1) + 'px';
      if (parallaxPhoto) parallaxPhoto.style.translate = '0 ' + (y * -0.06).toFixed(1) + 'px';
    }
    projectShots.forEach(function (img) {
      var box = img.getBoundingClientRect();
      if (box.bottom < -50 || box.top > vh + 50) return;
      var progress = ((box.top + box.height / 2) - vh / 2) / vh; // -1 … 1
      img.style.translate = '0 ' + (progress * -10).toFixed(1) + 'px';
    });
  }

  /* ---------- Jauges de langues ---------- */
  var meters = Array.prototype.slice.call(document.querySelectorAll('.meter'));
  function fillMeter(meter) {
    var bar = meter.querySelector('i');
    if (bar) bar.style.transform = 'scaleX(' + (Number(meter.getAttribute('data-level')) || 0) / 100 + ')';
  }
  if ('IntersectionObserver' in window && meters.length) {
    var meterObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        fillMeter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    meters.forEach(function (m) { meterObserver.observe(m); });
  } else {
    meters.forEach(fillMeter);
  }

  /* ---------- Filtres de projets ---------- */
  var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.p-card'));

  function cardMatches(card, value) {
    return value === 'all' || (card.getAttribute('data-cat') || '').split(/\s+/).indexOf(value) !== -1;
  }

  filters.forEach(function (btn) {
    // Compteurs calculés depuis les cartes : jamais désynchronisés du contenu.
    var count = btn.querySelector('em');
    if (count) count.textContent = cards.filter(function (card) { return cardMatches(card, btn.getAttribute('data-filter')); }).length;
  });

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-filter');
      filters.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      cards.forEach(function (card) {
        var show = cardMatches(card, value);
        card.classList.toggle('is-hidden', !show);
        if (show) card.classList.add('is-in');
      });
    });
  });

  // Halo qui suit le pointeur sur les cartes (souris uniquement).
  if (!reducedMotion && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var box = card.getBoundingClientRect();
        card.style.setProperty('--mx', Math.round(e.clientX - box.left) + 'px');
        card.style.setProperty('--my', Math.round(e.clientY - box.top) + 'px');
      });
    });
  }

  /* ---------- Dialogues modaux (détail projet, palette) ---------- */
  function openDialog(dialog) {
    if (dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('dialog-open');
    // Deux frames : l'état fermé est peint avant la transition d'entrée.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { dialog.classList.add('is-open'); });
    });
  }

  function closeDialog(dialog, done) {
    if (!dialog.open) { if (done) done(); return; }
    dialog.classList.remove('is-open');
    var finished = false;
    function onEnd(e) { if (e.target === dialog) finish(); }
    function finish() {
      if (finished) return;
      finished = true;
      dialog.removeEventListener('transitionend', onEnd);
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
      if (done) done();
    }
    dialog.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, reducedMotion ? 0 : 420);
  }

  function wireDialog(dialog, onClose) {
    // Échap et clic sur le fond : fermeture animée plutôt que la fermeture sèche du navigateur.
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); onClose(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) onClose(); });
  }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    window.requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2600);
  }

  /* =========================================================
     Détail d'un projet — tiroir alimenté par le contenu (traduit) de la carte :
     aucune donnée dupliquée. Lien profond : #project-<slug>.
     ========================================================= */
  var pd = {
    dialog: document.getElementById('projectDialog'),
    counter: document.getElementById('pdCounter'),
    prev: document.getElementById('pdPrev'),
    next: document.getElementById('pdNext'),
    close: document.getElementById('pdClose'),
    body: document.getElementById('pdBody'),
    visual: document.getElementById('pdVisual'),
    index: document.getElementById('pdIndex'),
    title: document.getElementById('pdTitle'),
    role: document.getElementById('pdRole'),
    company: document.getElementById('pdCompany'),
    period: document.getElementById('pdPeriod'),
    context: document.getElementById('pdContext'),
    work: document.getElementById('pdWork'),
    stack: document.getElementById('pdStack'),
    ask: document.getElementById('pdAsk')
  };
  var pdCard = null;
  var pdOpener = null;
  var pdHashBefore = '';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function browsableCards() {
    var visible = cards.filter(function (card) { return !card.classList.contains('is-hidden'); });
    return visible.indexOf(pdCard) !== -1 ? visible : cards;
  }

  function cloneChildren(from, to, filter) {
    to.textContent = '';
    Array.prototype.forEach.call(from.children, function (child) {
      if (filter && !filter(child)) return;
      var copy = child.cloneNode(true);
      copy.classList.remove('is-extra');
      copy.removeAttribute('style');
      to.appendChild(copy);
    });
  }

  function fillProject(card) {
    pdCard = card;
    var list = browsableCards();
    var pos = list.indexOf(card);
    pd.counter.textContent = pad2(pos + 1) + ' / ' + pad2(list.length);
    pd.prev.disabled = pd.next.disabled = list.length < 2;
    pd.dialog.style.setProperty('--p-hue', card.style.getPropertyValue('--p-hue'));

    var shot = card.querySelector('.p-window').cloneNode(true);
    shot.style.translate = '';
    var img = shot.querySelector('img');
    if (img) img.loading = 'eager';
    pd.visual.textContent = '';
    pd.visual.appendChild(shot);

    var detail = function (name) { var node = card.querySelector('.p-details [data-detail="' + name + '"]'); return node ? node.textContent : ''; };
    pd.index.textContent = card.querySelector('.p-index').textContent;
    pd.title.textContent = card.querySelector('.p-title').textContent;
    pd.role.textContent = detail('role');
    pd.company.textContent = card.querySelector('.p-org').textContent;
    pd.period.textContent = '';
    pd.period.appendChild(card.querySelector('.p-head .badge').cloneNode(true));
    pd.context.textContent = detail('context');
    cloneChildren(card.querySelector('.p-details .bullets'), pd.work);
    cloneChildren(card.querySelector('.tags'), pd.stack, function (tag) { return !tag.classList.contains('tag-more'); });
    pd.body.scrollTop = 0;
  }

  function openProject(card, opener) {
    if (!pd.dialog || !card) return;
    fillProject(card);
    if (!pd.dialog.open) {
      pdOpener = opener || document.activeElement;
      pdHashBefore = /^#project-/.test(window.location.hash) ? '' : window.location.hash;
      openDialog(pd.dialog);
      pd.close.focus();
    }
    if (window.history.replaceState) window.history.replaceState(null, '', '#' + card.id);
  }

  function closeProject(done) {
    if (!pd.dialog.open) { if (done) done(); return; }
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + pdHashBefore);
    }
    var card = pdCard;
    closeDialog(pd.dialog, function () {
      var target = pdOpener && document.contains(pdOpener) && pdOpener !== document.body ? pdOpener : (card && card.querySelector('.p-open'));
      if (target && !done) target.focus({ preventScroll: true });
      if (done) done();
    });
  }

  function stepProject(delta) {
    var list = browsableCards();
    var pos = list.indexOf(pdCard);
    openProject(list[(pos + delta + list.length) % list.length]);
  }

  if (pd.dialog) {
    cards.forEach(function (card) {
      var button = card.querySelector('.p-open');
      if (button) button.addEventListener('click', function () { openProject(card, button); });
    });
    wireDialog(pd.dialog, function () { closeProject(); });
    pd.close.addEventListener('click', function () { closeProject(); });
    pd.prev.addEventListener('click', function () { stepProject(-1); });
    pd.next.addEventListener('click', function () { stepProject(1); });
    pd.dialog.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.target.closest && e.target.closest('input, textarea')) return;
      var forward = (e.key === 'ArrowRight') !== (root.dir === 'rtl');
      stepProject(forward ? 1 : -1);
    });
    pd.ask.addEventListener('click', function () {
      var question = t('projectAskPrompt', { title: pd.title.textContent });
      closeProject(function () { askAssistant(question); });
    });
    document.addEventListener('portfolio:language', function () { if (pd.dialog.open && pdCard) fillProject(pdCard); });
  }

  /* =========================================================
     Chatbot — appelle /api/chat (proxy serveur vers Claude).
     La clé API ne quitte jamais le serveur. Si l'API est indisponible
     (hébergement statique, panne, clé absente), des réponses locales prennent le relais.
     ========================================================= */
  var chat = {
    toggle: document.getElementById('chatToggle'),
    panel: document.getElementById('chatPanel'),
    close: document.getElementById('chatClose'),
    clear: document.getElementById('chatClear'),
    form: document.getElementById('chatForm'),
    input: document.getElementById('chatInput'),
    send: document.getElementById('chatSend'),
    list: document.getElementById('chatMessages'),
    suggestions: document.getElementById('chatSuggestions'),
    status: document.getElementById('chatStatus'),
    statusText: document.getElementById('chatStatusText'),
    counter: document.getElementById('chatCounter')
  };
  var MAX_CHARS = 1000;
  var MAX_STORED = 40;
  var MAX_CONTEXT = 12; // même valeur que LIMITS.contextMessages côté serveur
  var REQUEST_TIMEOUT_MS = 35000;
  var history = loadHistory();
  var aiAvailable = null; // null = inconnu, true/false après /api/health
  var busy = false;

  function loadHistory() {
    try {
      var data = JSON.parse(storageGet(sessionStorage, CHAT_KEY) || '[]');
      return Array.isArray(data) ? data.filter(function (m) {
        return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
      }).slice(-MAX_STORED) : [];
    } catch (e) { return []; }
  }
  function saveHistory() {
    history = history.slice(-MAX_STORED);
    storageSet(sessionStorage, CHAT_KEY, JSON.stringify(history));
  }

  /* Langue d'un message : script arabe → ar ; indices français / anglais ; sinon langue de l'interface. */
  function detectLanguage(text) {
    if (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(text)) return 'ar';
    var lower = ' ' + text.toLowerCase().replace(/[^a-zàâäçéèêëîïôöùûüÿœ' ]+/g, ' ') + ' ';
    var fr = (lower.match(/ (le|la|les|des|est|quels?|quelles?|comment|projets?|compétences?|elle|vous|bonjour|salut|merci|avec|pour|sur|une?) /g) || []).length + (/[àâçéèêëîïôûœ]/.test(lower) ? 2 : 0);
    var en = (lower.match(/ (the|what|which|how|is|are|her|she|you|projects?|skills?|hello|hi|thanks|with|for|about|can) /g) || []).length;
    if (fr > en) return 'fr';
    if (en > fr) return 'en';
    return currentLang;
  }

  function localAnswer(question) {
    var lang = detectLanguage(question);
    var dict = I18N.dictionaries[lang];
    var q = question.toLowerCase();
    var has = function (words) { return words.some(function (w) { return q.indexOf(w) !== -1; }); };
    var key = 'chatLocalFallback';
    if (has(['projet', 'project', 'réalisation', 'portfolio', 'مشروع', 'مشاريع', 'أعمال'])) key = 'chatLocalProjects';
    else if (has(['contact', 'email', 'mail', 'linkedin', 'github', 'téléphone', 'phone', 'تواصل', 'بريد', 'هاتف', 'اتصال'])) key = 'chatLocalContact';
    else if (has(['cv', 'resume', 'résumé', 'سيرة'])) key = 'chatLocalCv';
    else if (has(['java', 'spring'])) key = 'chatLocalJava';
    else if (has(['compétence', 'competence', 'skill', 'stack', 'tech', 'مهار', 'تقني'])) key = 'chatLocalSkills';
    else if (has(['bonjour', 'salut', 'hello', 'hi ', 'hey', 'مرحب', 'سلام', 'أهلا', 'اهلا']) || q.trim() === 'hi') key = 'chatLocalHello';
    return { text: dict[key], lang: lang };
  }

  /* Rendu en texte brut, avec liens cliquables pour emails / URLs (aucun HTML injecté). */
  function appendRichText(node, text) {
    var pattern = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
    var last = 0;
    var match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) node.appendChild(document.createTextNode(text.slice(last, match.index)));
      var a = document.createElement('a');
      if (match[1]) { a.href = match[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      else { a.href = 'mailto:' + match[2]; }
      a.textContent = match[0];
      a.dir = 'ltr';
      node.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function createBubble(role, text, options) {
    options = options || {};
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'user' : 'bot') + (options.variant ? ' is-' + options.variant : '');
    if (options.lang) wrap.lang = options.lang;
    var label = document.createElement('span');
    label.className = 'sr-only';
    var labels = options.lang ? I18N.dictionaries[options.lang] : I18N.dictionaries[currentLang];
    label.textContent = (role === 'user' ? labels.chatYou : labels.chatBot) + ' : ';
    wrap.appendChild(label);
    if (options.note) {
      var note = document.createElement('span');
      note.className = 'msg-note';
      note.textContent = options.note;
      wrap.appendChild(note);
    }
    var body = document.createElement('span');
    body.className = 'msg-text';
    body.dir = 'auto';
    appendRichText(body, text);
    wrap.appendChild(body);
    if (options.retry) {
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'msg-retry';
      retry.textContent = (options.lang ? I18N.dictionaries[options.lang] : I18N.dictionaries[currentLang]).chatRetry;
      retry.addEventListener('click', function () {
        wrap.remove();
        // On retire la réponse locale de secours de l'historique avant de redemander une vraie réponse.
        if (history.length && history[history.length - 1].local) { history.pop(); saveHistory(); }
        requestReply();
      });
      wrap.appendChild(retry);
    }
    return wrap;
  }

  function scrollChatToEnd() { chat.list.scrollTop = chat.list.scrollHeight; }

  function renderChat() {
    if (!chat.list) return;
    chat.list.textContent = '';
    chat.list.appendChild(createBubble('assistant', t('chatGreeting'), { variant: 'greeting' }));
    history.forEach(function (m) {
      chat.list.appendChild(createBubble(m.role, m.content, m.local ? { variant: 'offline' } : {}));
    });
    if (chat.suggestions) chat.suggestions.hidden = history.length > 0;
    scrollChatToEnd();
  }

  function updateChatStatus() {
    if (!chat.status) return;
    var offline = aiAvailable === false;
    chat.status.classList.toggle('is-offline', offline);
    chat.statusText.setAttribute('data-i18n', offline ? 'chatStatusOffline' : 'chatStatusOnline');
    chat.statusText.textContent = t(offline ? 'chatStatusOffline' : 'chatStatusOnline');
  }

  function checkAvailability() {
    if (aiAvailable !== null || !window.fetch) { if (!window.fetch) aiAvailable = false; updateChatStatus(); return; }
    var controller = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 5000);
    fetch('/api/health', { headers: { Accept: 'application/json' }, signal: controller ? controller.signal : undefined })
      .then(function (res) { return res.ok ? res.json() : { ai: false }; })
      .then(function (data) { aiAvailable = Boolean(data && data.ai); })
      .catch(function () { aiAvailable = false; })
      .then(function () { clearTimeout(timer); updateChatStatus(); });
  }

  var typingNode = null;
  function setBusy(state) {
    busy = state;
    chat.form.setAttribute('aria-busy', state ? 'true' : 'false');
    chat.send.disabled = state;
    if (state) {
      typingNode = document.createElement('div');
      typingNode.className = 'msg bot is-typing';
      typingNode.setAttribute('role', 'status');
      typingNode.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      var label = document.createElement('span');
      label.className = 'sr-only';
      label.textContent = t('chatTyping');
      typingNode.appendChild(label);
      chat.list.appendChild(typingNode);
      scrollChatToEnd();
    } else if (typingNode) {
      typingNode.remove();
      typingNode = null;
    }
  }

  function pushAssistant(text, options) {
    var entry = { role: 'assistant', content: text };
    if (options && options.local) entry.local = true;
    history.push(entry);
    saveHistory();
    chat.list.appendChild(createBubble('assistant', text, options && options.local
      ? { variant: 'offline', note: options.note, lang: options.lang, retry: options.retry }
      : {}));
    scrollChatToEnd();
  }

  function showError(text, retry) {
    chat.list.appendChild(createBubble('assistant', text, { variant: 'error', retry: retry }));
    scrollChatToEnd();
  }

  function lastUserMessage() {
    for (var i = history.length - 1; i >= 0; i--) if (history[i].role === 'user') return history[i].content;
    return '';
  }

  function answerLocally(noteKey, retry) {
    var answer = localAnswer(lastUserMessage());
    pushAssistant(answer.text, { local: true, lang: answer.lang, note: I18N.dictionaries[answer.lang][noteKey], retry: Boolean(retry) });
  }

  // Seuls les vrais échanges IA servent de contexte (les réponses locales sont exclues).
  function apiMessages() {
    return history.filter(function (m) { return !m.local; }).slice(-MAX_CONTEXT).map(function (m) {
      return { role: m.role, content: m.content };
    });
  }

  function requestReply() {
    if (busy) return;
    setBusy(true);

    if (aiAvailable === false) {
      setTimeout(function () { setBusy(false); answerLocally('chatOfflineNote'); }, 450);
      return;
    }

    var controller = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, REQUEST_TIMEOUT_MS);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ lang: currentLang, messages: apiMessages() }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (result) {
        setBusy(false);
        if (result.status === 200 && result.data.reply) {
          aiAvailable = true;
          updateChatStatus();
          pushAssistant(result.data.reply);
          return;
        }
        var code = result.data && result.data.error;
        if (result.status === 429 || code === 'rate_limited') return showError(t('chatErrorRate'), false);
        if (code === 'too_long') return showError(t('chatErrorTooLong', { max: MAX_CHARS }), false);
        if (code === 'invalid_request') return showError(t('chatErrorInvalid'), false);
        if (result.status === 404 || result.status === 405) {
          aiAvailable = false; // pas de backend (hébergement statique) : inutile de réessayer
          updateChatStatus();
          return answerLocally('chatOfflineNote');
        }
        // Panne ponctuelle de l'API : réponse locale pour ce message, mais on réessaiera au suivant.
        if (code === 'unavailable') return answerLocally('chatOfflineNote');
        answerLocally('chatErrorGeneric', true);
      })
      .catch(function () {
        setBusy(false);
        answerLocally('chatErrorGeneric', true);
      })
      .then(function () { clearTimeout(timer); });
  }

  function sendMessage(text) {
    var value = (text || '').trim();
    if (!value || busy) return;
    if (value.length > MAX_CHARS) { showError(t('chatErrorTooLong', { max: MAX_CHARS }), false); return; }
    history.push({ role: 'user', content: value });
    saveHistory();
    chat.list.appendChild(createBubble('user', value));
    if (chat.suggestions) chat.suggestions.hidden = true;
    chat.input.value = '';
    autoSize();
    updateCounter();
    requestReply();
  }

  function autoSize() {
    chat.input.style.height = 'auto';
    chat.input.style.height = Math.min(chat.input.scrollHeight, 120) + 'px';
  }
  function updateCounter() {
    var n = chat.input.value.length;
    chat.counter.textContent = n > MAX_CHARS * 0.8 ? t('chatCounter', { n: n, max: MAX_CHARS }) : '';
  }

  function setChatOpen(open) {
    chat.panel.classList.toggle('is-open', open);
    chat.toggle.classList.toggle('is-open', open);
    chat.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    chat.toggle.setAttribute('data-i18n-attr', 'aria-label:' + (open ? 'chatClose' : 'chatOpen'));
    chat.toggle.setAttribute('aria-label', t(open ? 'chatClose' : 'chatOpen'));
    document.body.classList.toggle('chat-open', open);
    if (open) {
      checkAvailability();
      scrollChatToEnd();
      setTimeout(function () { chat.input.focus(); }, 60);
    }
  }

  if (chat.toggle && chat.panel && chat.form) {
    renderChat();

    chat.toggle.addEventListener('click', function () { setChatOpen(!chat.panel.classList.contains('is-open')); });
    chat.close.addEventListener('click', function () { setChatOpen(false); chat.toggle.focus(); });
    chat.panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setChatOpen(false); chat.toggle.focus(); }
    });
    chat.clear.addEventListener('click', function () {
      history = [];
      storageRemove(sessionStorage, CHAT_KEY);
      renderChat();
      chat.input.focus();
    });
    chat.form.addEventListener('submit', function (e) { e.preventDefault(); sendMessage(chat.input.value); });
    chat.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(chat.input.value); }
    });
    chat.input.addEventListener('input', function () { autoSize(); updateCounter(); });
    if (chat.suggestions) {
      chat.suggestions.addEventListener('click', function (e) {
        var chip = e.target.closest('.chat-chip');
        if (chip) sendMessage(chip.textContent);
      });
    }
    document.addEventListener('portfolio:language', function () {
      // La conversation est conservée ; seuls l'accueil et les libellés changent de langue.
      if (!busy) renderChat();
      updateChatStatus();
    });
  }

  function askAssistant(question) {
    if (!chat.panel) return;
    setChatOpen(true);
    if (question) sendMessage(question);
  }

  /* =========================================================
     Palette de commandes — Ctrl/⌘ K ou « / ».
     Sections, projets, actions, préférences ; sans résultat, la question part à l'assistant IA.
     ========================================================= */
  var cmdk = {
    dialog: document.getElementById('cmdk'),
    input: document.getElementById('cmdkInput'),
    list: document.getElementById('cmdkList'),
    trigger: document.getElementById('cmdkTrigger')
  };
  var LANG_NAMES = { fr: 'Français', en: 'English', ar: 'العربية' };
  var ACCENT_SWATCH = { jade: '#10b981', violet: '#8b5cf6', ocean: '#0ea5e9' };
  var ACCENT_LABELS = { jade: 'accentJade', violet: 'accentViolet', ocean: 'accentOcean' };
  // Mots-clés multilingues : on trouve « skills » même quand l'interface est en français.
  var SECTION_KEYWORDS = {
    profil: 'profile about profil نبذة', experience: 'experience work jobs expérience الخبرة',
    projets: 'projects portfolio work projets المشاريع', competences: 'skills stack tech compétences المهارات',
    formation: 'education school degree formation diplôme التعليم', contact: 'contact email hire التواصل'
  };
  var ICONS = {
    arrow: '<path d="M5 12h13"/><path d="M12 5.5l6.5 6.5-6.5 6.5"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',
    project: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>',
    download: '<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    spark: '<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
    swatch: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
    up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  var cmdResults = [];
  var cmdActive = 0;
  var cmdOpener = null;

  function fold(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function goToSection(id) {
    var section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (window.history.replaceState) window.history.replaceState(null, '', '#' + id);
    var heading = section.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  }

  function copyEmail() {
    var fail = function () { toast(t('cmdCopyFailed', { email: EMAIL })); };
    if (!navigator.clipboard || !navigator.clipboard.writeText) return fail();
    navigator.clipboard.writeText(EMAIL).then(function () { toast(t('cmdCopied')); }, fail);
  }

  function buildCommands() {
    var list = [];
    var add = function (group, label, icon, run, extra) {
      extra = extra || {};
      list.push({ group: group, label: label, icon: icon, run: run, meta: extra.meta || '', keywords: extra.keywords || '', checked: Boolean(extra.checked), swatch: extra.swatch });
    };

    var nav = t('cmdGroupNav');
    add(nav, t('cmdHome'), 'home', function () { goToSection('accueil'); }, { keywords: 'home accueil top hero الرئيسية' });
    navLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var label = link.querySelector('[data-i18n]');
      var num = link.querySelector('.nav-num');
      add(nav, label ? label.textContent : id, 'arrow', function () { goToSection(id); },
        { meta: num ? num.textContent : '', keywords: id + ' ' + (SECTION_KEYWORDS[id] || '') });
    });

    var projects = t('cmdGroupProjects');
    cards.forEach(function (card) {
      var tags = Array.prototype.map.call(card.querySelectorAll('.tags span:not(.tag-more)'), function (s) { return s.textContent; }).join(' ');
      add(projects, card.querySelector('.p-title').textContent, 'project', function () { openProject(card, cmdk.trigger); },
        { meta: card.querySelector('.p-org').textContent, keywords: tags + ' ' + card.getAttribute('data-cat') + ' ' + card.getAttribute('data-slug') });
    });

    var actions = t('cmdGroupActions');
    add(actions, t('heroCvBtn'), 'download', function () {
      var link = document.querySelector('a[download][href$=".pdf"]');
      if (link) link.click();
    }, { meta: 'PDF', keywords: 'cv resume pdf download télécharger سيرة' });
    add(actions, t('cmdCopyEmail'), 'copy', copyEmail, { meta: EMAIL, keywords: 'email mail copy copier بريد' });
    add(actions, t('cmdSendEmail'), 'mail', function () { window.location.href = 'mailto:' + EMAIL; }, { keywords: 'email mail write contact écrire بريد' });
    add(actions, t('cmdLinkedIn'), 'external', function () { window.open('https://www.linkedin.com/in/asmaajmi', '_blank', 'noopener'); }, { meta: '/in/asmaajmi', keywords: 'linkedin social' });
    add(actions, t('cmdGithub'), 'external', function () { window.open('https://github.com/asmaajmi', '_blank', 'noopener'); }, { meta: '/asmaajmi', keywords: 'github code repo' });
    add(actions, t('toTop'), 'up', function () { window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); }, { keywords: 'top haut up' });

    var prefs = t('cmdGroupPrefs');
    var saved = storageGet(localStorage, THEME_KEY);
    var screenCenter = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 3) };
    add(prefs, t(currentTheme() === 'dark' ? 'themeToLight' : 'themeToDark'), currentTheme() === 'dark' ? 'sun' : 'moon',
      function () { chooseTheme(currentTheme() === 'dark' ? 'light' : 'dark', screenCenter); }, { keywords: 'theme dark light mode sombre clair الوضع' });
    add(prefs, t('cmdThemeSystem'), 'system', function () { chooseTheme('system', screenCenter); },
      { checked: saved !== 'light' && saved !== 'dark', keywords: 'theme system auto système' });
    I18N.languages.forEach(function (lang) {
      add(prefs, t('cmdLanguage', { name: LANG_NAMES[lang] }), 'globe', function () {
        storageSet(localStorage, LANG_KEY, lang);
        applyTranslations(lang);
      }, { meta: lang.toUpperCase(), checked: lang === currentLang, keywords: 'language langue لغة ' + lang });
    });
    ACCENTS.forEach(function (accent) {
      var name = t(ACCENT_LABELS[accent]);
      add(prefs, t('cmdAccent', { name: name }), 'swatch', function () { setAccent(accent); },
        { checked: accent === currentAccent(), swatch: ACCENT_SWATCH[accent], keywords: 'accent color colour couleur لون ' + accent });
    });
    return list;
  }

  function scoreCommand(cmd, tokens) {
    var label = fold(cmd.label);
    var hay = label + ' ' + fold(cmd.keywords + ' ' + cmd.meta + ' ' + cmd.group);
    var score = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (hay.indexOf(tok) === -1) return 0;
      score += label.indexOf(tok) === 0 ? 4 : (new RegExp('(^|\\s)' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(label) ? 3 : (label.indexOf(tok) !== -1 ? 2 : 1));
    }
    return score;
  }

  function highlight(node, text, query) {
    var at = query ? fold(text).indexOf(fold(query)) : -1;
    if (at === -1) { node.textContent = text; return; }
    node.appendChild(document.createTextNode(text.slice(0, at)));
    var mark = document.createElement('mark');
    mark.textContent = text.slice(at, at + query.length);
    node.appendChild(mark);
    node.appendChild(document.createTextNode(text.slice(at + query.length)));
  }

  function svgIcon(name) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function renderCommands() {
    var query = cmdk.input.value.trim();
    var tokens = fold(query).split(/\s+/).filter(Boolean);
    var all = buildCommands();
    var results = all;
    if (tokens.length) {
      results = all.map(function (cmd, i) { return { cmd: cmd, score: scoreCommand(cmd, tokens), i: i }; })
        .filter(function (r) { return r.score > 0; })
        .sort(function (a, b) { return b.score - a.score || a.i - b.i; })
        .map(function (r) { return r.cmd; });
    }
    var hasMatches = results.length > 0;
    var askGroup = t('cmdGroupAsk');
    results.push({ group: askGroup, label: query ? t('cmdAsk', { q: query }) : t('cmdAskAny'), icon: 'spark', meta: '', keywords: '',
      run: function () { askAssistant(query); } });

    // Regroupement dans l'ordre de première apparition (le meilleur résultat garde son groupe en tête).
    var order = [];
    var byGroup = {};
    results.forEach(function (cmd) {
      if (!byGroup[cmd.group]) { byGroup[cmd.group] = []; order.push(cmd.group); }
      byGroup[cmd.group].push(cmd);
    });

    cmdResults = [];
    cmdk.list.textContent = '';
    if (!hasMatches) {
      var empty = document.createElement('li');
      empty.className = 'cmdk-empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = t('cmdEmpty', { q: query });
      cmdk.list.appendChild(empty);
    }
    order.forEach(function (group, g) {
      var section = document.createElement('li');
      section.setAttribute('role', 'group');
      section.setAttribute('aria-labelledby', 'cmdk-g' + g);
      var heading = document.createElement('div');
      heading.className = 'cmdk-group';
      heading.id = 'cmdk-g' + g;
      heading.textContent = group;
      var items = document.createElement('ul');
      items.setAttribute('role', 'none');
      byGroup[group].forEach(function (cmd) {
        var index = cmdResults.length;
        var item = document.createElement('li');
        item.className = 'cmdk-item';
        item.id = 'cmdk-opt-' + index;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        var ico = document.createElement('span');
        ico.className = 'cmdk-ico';
        ico.innerHTML = svgIcon(cmd.icon);
        if (cmd.swatch) ico.style.color = cmd.swatch;
        var label = document.createElement('span');
        label.className = 'cmdk-label';
        label.dir = 'auto';
        highlight(label, cmd.label, tokens.length ? query : '');
        item.appendChild(ico);
        item.appendChild(label);
        if (cmd.meta) {
          var meta = document.createElement('span');
          meta.className = 'cmdk-meta';
          meta.dir = 'ltr';
          meta.textContent = cmd.meta;
          item.appendChild(meta);
        }
        if (cmd.checked) {
          var check = document.createElement('span');
          check.className = 'cmdk-check';
          check.innerHTML = svgIcon('check');
          item.appendChild(check);
          item.setAttribute('aria-checked', 'true');
        }
        item.addEventListener('mousemove', function () { if (cmdActive !== index) setActiveCommand(index); });
        item.addEventListener('click', function () { runCommand(index); });
        items.appendChild(item);
        cmdResults.push(cmd);
      });
      section.appendChild(heading);
      section.appendChild(items);
      cmdk.list.appendChild(section);
    });
    setActiveCommand(0);
  }

  function setActiveCommand(index) {
    if (!cmdResults.length) return;
    cmdActive = (index + cmdResults.length) % cmdResults.length;
    var items = cmdk.list.querySelectorAll('.cmdk-item');
    for (var i = 0; i < items.length; i++) items[i].setAttribute('aria-selected', i === cmdActive ? 'true' : 'false');
    var active = items[cmdActive];
    cmdk.input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function runCommand(index) {
    var cmd = cmdResults[index];
    if (!cmd) return;
    // L'action s'exécute une fois la palette refermée (focus et défilement à l'endroit attendu).
    closePalette(cmd.run);
  }

  function openPalette() {
    if (!cmdk.dialog) return;
    if (pd.dialog && pd.dialog.open) { closeProject(openPalette); return; }
    if (cmdk.dialog.open) return;
    cmdOpener = document.activeElement;
    cmdk.input.value = '';
    renderCommands();
    openDialog(cmdk.dialog);
    cmdk.input.focus();
  }

  function closePalette(then) {
    closeDialog(cmdk.dialog, function () {
      if (then) then();
      else if (cmdOpener && document.contains(cmdOpener) && cmdOpener !== document.body) cmdOpener.focus({ preventScroll: true });
    });
  }

  function isTyping(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  if (cmdk.dialog && cmdk.input) {
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    document.querySelectorAll('.kbd-shortcut').forEach(function (kbd) { kbd.textContent = isMac ? '⌘ K' : 'Ctrl K'; });

    if (cmdk.trigger) cmdk.trigger.addEventListener('click', openPalette);
    wireDialog(cmdk.dialog, function () { closePalette(); });
    cmdk.input.addEventListener('input', renderCommands);
    cmdk.input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveCommand(cmdActive + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveCommand(cmdActive - 1); }
      else if (e.key === 'PageDown') { e.preventDefault(); setActiveCommand(Math.min(cmdActive + 5, cmdResults.length - 1)); }
      else if (e.key === 'PageUp') { e.preventDefault(); setActiveCommand(Math.max(cmdActive - 5, 0)); }
      else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); runCommand(cmdActive); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    document.addEventListener('keydown', function (e) {
      var key = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && key === 'k') {
        e.preventDefault();
        if (cmdk.dialog.open) closePalette(); else openPalette();
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !isTyping(e.target) && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        openPalette();
      }
    });
    document.addEventListener('portfolio:language', function () { if (cmdk.dialog.open) renderCommands(); });
  }

  /* ---------- Heure locale à Sousse ---------- */
  var localTime = document.getElementById('localTime');
  function updateLocalTime() {
    if (!localTime || !window.Intl) return;
    try {
      var time = new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-TN' : currentLang, { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' }).format(new Date());
      localTime.textContent = t('localTime', { time: time });
      localTime.hidden = false;
    } catch (e) { localTime.hidden = true; }
  }
  document.addEventListener('portfolio:language', updateLocalTime);
  window.setInterval(updateLocalTime, 30000);

  /* ---------- Démarrage ---------- */
  applyTranslations(currentLang);
  syncThemeColor();
  onScroll();

  // Lien profond vers un projet (#project-<slug>) : ouvrir directement son détail.
  if (/^#project-[\w-]+$/.test(window.location.hash)) {
    var linked = document.getElementById(window.location.hash.slice(1));
    if (linked && linked.classList.contains('p-card')) {
      linked.classList.add('is-in');
      window.setTimeout(function () { openProject(linked, linked.querySelector('.p-open')); }, 150);
    }
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
