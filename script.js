/* =========================================================
   Portfolio — Asma Ajmi | interactions
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Thème désactivé : forcer le mode clair ---------- */
  var root = document.documentElement;
  var STORAGE_KEY = 'aa-theme';

  function forceLightTheme() {
    root.setAttribute('data-theme', 'light');
    try { localStorage.setItem(STORAGE_KEY, 'light'); } catch (e) { /* stockage indisponible */ }
  }

  forceLightTheme();

  /* ---------- Menu mobile ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
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
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (toTop) toTop.classList.toggle('is-visible', y > 500);

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Apparition au défilement ---------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window && revealables.length) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry, i) {
        var el = entry.target;

        // Élément déjà dépassé (lien d'ancre, restauration du scroll) : afficher sans animation.
        if (!entry.isIntersecting) {
          if (entry.boundingClientRect.bottom < 0) {
            el.classList.add('is-in');
            obs.unobserve(el);
          }
          return;
        }

        setTimeout(function () { el.classList.add('is-in'); }, i * 60);
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Jauges de langues ---------- */
  var meters = Array.prototype.slice.call(document.querySelectorAll('.meter'));

  function fillMeter(meter) {
    var bar = meter.querySelector('i');
    if (bar) bar.style.width = (meter.getAttribute('data-level') || 0) + '%';
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
      filters.forEach(function (b) { b.classList.toggle('is-active', b === btn); });

      cards.forEach(function (card) {
        var cats = (card.getAttribute('data-cat') || '').split(/\s+/);
        var show = value === 'all' || cats.indexOf(value) !== -1;
        card.classList.toggle('is-hidden', !show);
        if (show) card.classList.add('is-in');
      });
    });
  });

  /* ---------- Chatbot assistant ---------- */
  var chatToggle = document.getElementById('chatToggle');
  var chatPanel = document.getElementById('chatPanel');
  var chatClose = document.getElementById('chatClose');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var chatMessages = document.getElementById('chatMessages');

  function addChatMessage(text, type) {
    if (!chatMessages) return;
    var msg = document.createElement('div');
    msg.className = 'msg ' + type;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleBotReply(question) {
    var message = (question || '').toLowerCase();

    if (!message || message.includes('bonjour') || message.includes('salut') || message.includes('hi')) {
      return 'Bonjour ! Je peux vous aider à découvrir mes projets, mes compétences ou mes coordonnées.';
    }
    if (message.includes('projet') || message.includes('travaux') || message.includes('portfolio')) {
      return 'Je travaille surtout sur des projets backend Java / Spring Boot, des plateformes bancaires, des microservices et des solutions métier orientées données.';
    }
    if (message.includes('competence') || message.includes('stack') || message.includes('tech')) {
      return 'Ma stack principale : Java, Spring Boot, PostgreSQL, Oracle, Redis, Elasticsearch, Docker, Kubernetes, GitLab CI/CD et Keycloak.';
    }
    if (message.includes('contact') || message.includes('email') || message.includes('linkedin') || message.includes('github')) {
      return 'Vous pouvez me contacter par email : asmaajmi237@gmail.com, ou via LinkedIn et GitHub mentionnés dans la section contact.';
    }
    if (message.includes('cv') || message.includes('resume')) {
      return 'Vous pouvez télécharger mon CV depuis le bouton dédié dans la section contact.';
    }
    if (message.includes('java') || message.includes('spring')) {
      return 'Java et Spring Boot sont au cœur de mon travail backend, notamment pour des API REST, la conception de services et les architectures microservices.';
    }
    return 'Merci pour votre message. Je suis Asma Ajmi, ingénieure logicielle spécialisée en backend Java / Spring Boot, et je suis disponible pour les opportunités pertinentes.';
  }

  if (chatToggle && chatPanel) {
    chatToggle.addEventListener('click', function () {
      var isOpen = chatPanel.classList.toggle('is-open');
      chatToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen && chatInput) chatInput.focus();
    });
  }

  if (chatClose && chatPanel) {
    chatClose.addEventListener('click', function () {
      chatPanel.classList.remove('is-open');
      if (chatToggle) chatToggle.setAttribute('aria-expanded', 'false');
    });
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = chatInput.value.trim();
      if (!value) return;

      addChatMessage(value, 'user');
      chatInput.value = '';

      setTimeout(function () {
        addChatMessage(handleBotReply(value), 'bot');
      }, 250);
    });
  }

  /* ---------- Année du footer ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
