document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  /* ---------- Hero title: word by word ---------- */
  const title = document.getElementById('title');
  const text = title.textContent.trim();
  title.setAttribute('aria-label', text);
  title.innerHTML = text
    .split(' ')
    .map((w, i) => `<span class="word" aria-hidden="true" style="--i:${i}">${w}</span>`)
    .join(' ');

  /* ---------- Scroll progress + active menu link ---------- */
  const progress = document.getElementById('progress');
  const links = [...document.querySelectorAll('.menu a[href^="#"]:not(.btn)')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
  let ticking = false;

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    let current = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === current));
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Counters ---------- */
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      entry.target.querySelectorAll('[data-count]').forEach(animateCount);
      if (entry.target.dataset.count) animateCount(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  /* ---------- Card tilt + spotlight ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.classList.add('tilting');
        card.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Button ripple ---------- */
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (reduceMotion) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      btn.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove());
    });
  });

  /* ---------- Hero stage: parallax + mini game ---------- */
  const stage = document.getElementById('stage');
  const char = document.getElementById('char');
  const scoreEl = document.getElementById('score');
  const hint = document.getElementById('hint');
  let score = 0;

  if (finePointer && !reduceMotion) {
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      stage.querySelectorAll('.layer').forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        l.style.transform = `translate(${-x * d}px, ${-y * d}px)`;
      });
    });
  }

  const spawn = (cls, styles) => {
    const el = document.createElement('span');
    el.className = cls;
    Object.entries(styles).forEach(([k, v]) => el.style.setProperty(k, v));
    stage.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    return el;
  };

  const confetti = () => {
    const colors = ['#6fe3c1', '#ffcf4a', '#ff7aa8', '#8f84ff'];
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 110;
      const el = spawn('spark', {
        '--x': `${Math.cos(a) * dist}px`,
        '--y': `${Math.sin(a) * dist}px`,
        '--c': colors[i % colors.length]
      });
      el.style.left = '50%';
      el.style.bottom = '90px';
    }
  };

  char.addEventListener('click', () => {
    if (char.classList.contains('jump')) return;
    char.classList.add('jump');
    hint.classList.add('gone');
    if (reduceMotion) { score += 1; scoreEl.textContent = score; return; }

    const coin = spawn('coin', { '--x': `${(Math.random() - 0.5) * 80}px` });
    coin.style.left = 'calc(50% - 10px)';
    coin.style.bottom = '110px';

    setTimeout(() => {
      score += 1;
      scoreEl.textContent = score;
      if (score % 10 === 0) confetti();
    }, 350);
  });
  char.addEventListener('animationend', (e) => { if (e.animationName === 'jump') char.classList.remove('jump'); });

  /* ---------- Contact form ---------- */
  const form = document.getElementById('form');
  const status = document.getElementById('status');
  const rules = {
    name: (v) => v.trim().length >= 2 || 'შეიყვანე სახელი (მინიმუმ 2 სიმბოლო).',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'შეიყვანე სწორი ელფოსტა, მაგალითად: name@mail.com',
    message: (v) => v.trim().length >= 10 || 'შეტყობინება ძალიან მოკლეა (მინიმუმ 10 სიმბოლო).'
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    let valid = true;

    Object.keys(rules).forEach((field) => {
      const input = form.elements[field];
      const errorEl = form.querySelector(`[data-for="${field}"]`);
      const result = rules[field](input.value);
      const ok = result === true;
      input.removeAttribute('aria-invalid');
      void input.offsetWidth; // restart shake animation
      input.setAttribute('aria-invalid', String(!ok));
      errorEl.textContent = ok ? '' : result;
      if (!ok) valid = false;
    });

    if (valid) {
      // აქ მიუერთე რეალური გაგზავნა (fetch, Formspree და ა.შ.)
      status.textContent = 'გაიგზავნა. მალე გიპასუხებთ!';
      form.reset();
    }
  });
});
