'use strict';

document.documentElement.classList.replace('no-js', 'js');

/* PREENCHA SOMENTE COM DADOS CONFIRMADOS.
 * whatsapp: DDI + DDD + número, somente dígitos.
 * email: endereço real que receberá o contato.
 * endpoint: URL HTTPS de um serviço que aceite JSON via POST e retorne HTTP 2xx.
 * Prioridade: endpoint > WhatsApp > e-mail. Sem destino, o formulário fica desativado.
 * Nunca coloque senhas ou chaves privadas neste arquivo público.
 */
const CONTACT_CONFIG = Object.freeze({ whatsapp: '5521982277181', email: '', endpoint: '' });

(() => {
  const header = document.querySelector('.header');
  const menu = document.querySelector('#menu-principal');
  const toggle = document.querySelector('.menu-toggle');
  const mobile = window.matchMedia('(max-width: 840px)');

  function closeMenu(restoreFocus = false) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const opening = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute('aria-label', opening ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', opening);
    document.body.classList.toggle('menu-open', opening && mobile.matches);
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!header.contains(document.activeElement)) closeMenu();
    });
  });
  mobile.addEventListener('change', () => closeMenu());

  let scrollQueued = false;
  const navigationLinks = [...menu.querySelectorAll('a:not(.button)')];
  const navigationSections = navigationLinks.map(link => document.querySelector(link.getAttribute('href')));
  function updateScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    const threshold = header.offsetHeight + 100;
    let activeId = 'inicio';
    // Compare physical position, because the menu order differs from the page's order.
    let closestTop = -Infinity;
    navigationSections.forEach(section => {
      const top = section.getBoundingClientRect().top;
      if (top <= threshold && top > closestTop) { activeId = section.id; closestTop = top; }
    });
    navigationLinks.forEach(link => {
      if (link.getAttribute('href') === '#' + activeId) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  updateScroll();

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !motionPreference.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px 15px 0px' });
    document.querySelectorAll('.reveal').forEach(element => {
      // Never hide visible or already visited content when the script first runs.
      if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add('is-visible');
      else observer.observe(element);
    });
    document.documentElement.classList.add('motion-ready');
    document.addEventListener('focusin', event => {
      const reveal = event.target.closest('.reveal');
      if (reveal) { reveal.classList.add('is-visible'); observer.unobserve(reveal); }
    });
    motionPreference.addEventListener('change', event => {
      if (event.matches) { document.documentElement.classList.remove('motion-ready'); observer.disconnect(); }
    });
  }

  const accordionItems = [...document.querySelectorAll('.faq-list details')];
  accordionItems.forEach(item => item.addEventListener('toggle', () => {
    if (item.open) accordionItems.forEach(other => { if (other !== item) other.open = false; });
  }));

  const form = document.querySelector('#contact-form');
  const fields = document.querySelector('#contact-fields');
  const notice = document.querySelector('#form-availability');
  const status = document.querySelector('#form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const subject = document.querySelector('#assunto');
  const whatsapp = CONTACT_CONFIG.whatsapp.trim();
  const email = CONTACT_CONFIG.email.trim();
  let endpoint = '';
  try {
    if (CONTACT_CONFIG.endpoint) {
      const url = new URL(CONTACT_CONFIG.endpoint);
      if (url.protocol === 'https:') endpoint = url.href;
    }
  } catch { /* An invalid URL keeps the endpoint inactive. */ }
  const hasWhatsapp = /^\d{10,15}$/.test(whatsapp);
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSend = Boolean(endpoint || hasWhatsapp || hasEmail);

  if (canSend) {
    fields.disabled = false;
    notice.textContent = endpoint
      ? 'Apresente brevemente sua situação. Os campos marcados com * são obrigatórios.'
      : hasWhatsapp
        ? 'Ao continuar, sua mensagem será preparada no WhatsApp. Confira o texto e confirme o envio por lá.'
        : 'Ao continuar, a mensagem será aberta no seu aplicativo de e-mail. Confira o texto e confirme o envio por lá.';
  }
  document.querySelectorAll('[data-subject]').forEach(link => {
    link.addEventListener('click', () => { subject.value = link.dataset.subject; });
  });

  function showStatus(message, isError = false) {
    status.hidden = false;
    status.textContent = message;
    status.dataset.error = String(isError);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!canSend) { showStatus('O envio pelo formulário ainda não está disponível. Entre em contato pelo Instagram.'); return; }
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    for (const key of Object.keys(data)) data[key] = String(data[key]).trim();
    if (data.nome.length < 2 || data.mensagem.length < 10) {
      showStatus('Preencha seu nome e uma mensagem com pelo menos 10 caracteres.', true);
      return;
    }
    const message = [
      'Olá, Luciana. Gostaria de conversar sobre ' + data.assunto + '.',
      '', 'Nome: ' + data.nome, 'E-mail: ' + data.email,
      ...(data.telefone ? ['Telefone / WhatsApp: ' + data.telefone] : []),
      '', data.mensagem
    ].join('\n');

    if (endpoint) {
      submitButton.disabled = true;
      form.setAttribute('aria-busy', 'true');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      showStatus('Enviando sua mensagem…');
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data), signal: controller.signal
        });
        if (!response.ok) throw new Error('Envio não confirmado');
        showStatus('Mensagem enviada. Obrigada pelo contato.');
        form.reset();
      } catch {
        showStatus('Não foi possível confirmar o envio. Seus dados foram mantidos. Tente novamente ou entre em contato pelo Instagram.', true);
      } finally {
        window.clearTimeout(timeout);
        submitButton.disabled = false;
        form.removeAttribute('aria-busy');
      }
      return;
    }
    if (hasWhatsapp) {
      showStatus('Sua mensagem foi preparada. Confirme o envio no WhatsApp.');
      window.location.assign('https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message));
    } else {
      showStatus('Sua mensagem foi preparada. Confirme o envio no seu aplicativo de e-mail. Se ele não abrir, entre em contato pelo Instagram.');
      window.location.assign('mailto:' + email + '?subject=' + encodeURIComponent('Contato pelo site — ' + data.assunto) + '&body=' + encodeURIComponent(message));
    }
  });
})();
