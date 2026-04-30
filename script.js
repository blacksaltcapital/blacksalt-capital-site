const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const year = document.getElementById('year');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Contact form — AJAX submit via Formspree
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('contact-submit');
    const success = document.getElementById('contact-success');
    const error = document.getElementById('contact-error');

    btn.disabled = true;
    btn.textContent = 'Sending…';
    success.style.display = 'none';
    error.style.display = 'none';

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        success.style.display = 'block';
        contactForm.reset();
      } else {
        error.style.display = 'block';
      }
    } catch {
      error.style.display = 'block';
    }

    btn.disabled = false;
    btn.textContent = 'Send Message';
  });
}

// Scroll spy — highlight nav link for the currently visible section
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.site-nav a[href^="#"]');

if (sections.length && navLinks.length) {
  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle('nav-active', link.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-15% 0px -75% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
}
