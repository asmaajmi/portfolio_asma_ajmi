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
  var CHAT_KEY = 'aa-chat-history';

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

  function setTheme(theme, animate) {
    if (animate) {
      root.classList.add('theme-transition');
      window.setTimeout(function () { root.classList.remove('theme-transition'); }, 400);
    }
    root.setAttribute('data-theme', theme);
    updateThemeButton();
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      storageSet(localStorage, THEME_KEY, next);
      setTheme(next, true);
    });
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
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Variante d'entrée par type de bloc (les directions latérales suivent le sens de lecture via --dir).
  var REVEAL_VARIANTS = {
    '.profil-text': 'left', '.code-card': 'right', '.tl-item': 'left', '.p-card': 'zoom',
    '.edu-card': 'zoom', '.c-card': 'zoom', '.pillars li': 'zoom', '.skill-card': 'up', '.contact-cta': 'blur'
  };
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

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-filter');
      filters.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      cards.forEach(function (card) {
        var cats = (card.getAttribute('data-cat') || '').split(/\s+/);
        var show = value === 'all' || cats.indexOf(value) !== -1;
        card.classList.toggle('is-hidden', !show);
        if (show) card.classList.add('is-in');
      });
    });
  });

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

  /* ---------- Démarrage ---------- */
  applyTranslations(currentLang);
  onScroll();

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
