// Portal sign-in guard + server sync.
// <body data-auth="admin"> pages need an admin (Ashley/Greg); data-auth="client" pages need the client (or an admin viewing).
// Until Netlify Identity is turned on for the site, pages stay in preview mode and keep data in this browser only.
import { getSettings, getUser, logout } from './vendor/identity.js';

const need = document.body.dataset.auth;           // 'admin' | 'client'
const here = location.pathname.split('/').pop() || 'index.html';
const SECTIONS = {                                 // browser key -> saved section on the server
  'sr-portal-choices': 'choices',
  'sr-portal-choice-dates': 'choiceDates',
  'sr-portal-up': 'upgrades',
  'sr-portal-client-dates': 'clientDates',
  'sr-portal-client-files': 'clientFiles',
  'sr-portal-hidden': 'visibility',
  'sr-portal-contract': 'contract',
  'sr-portal-boards': 'boards',
  'sr-portal-contract-sig': 'contractSignature', // read-only here: the server stamps signatures (POST sign)
  'sr-portal-messages': 'messages'               // read-only here: messages are added with POST messages
};
const CLIENT_WRITE = ['choices', 'choiceDates', 'upgrades', 'clientDates', 'clientFiles'];
const ADMIN_WRITE = [...CLIENT_WRITE, 'visibility', 'contract', 'boards'];
const reveal = () => document.body.classList.add('auth-ok');
setTimeout(reveal, 5000);                          // never leave a blank page if something stalls

function banner(text, cls) {
  const b = document.querySelector('.pt-demo');
  if (b) { b.innerHTML = text; if (cls) b.classList.add(cls); }
}

async function api(path, opts = {}) {
  const r = await fetch('/api/portal/' + path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (r.status === 401) { location.href = 'login.html?next=' + encodeURIComponent(here + location.hash); throw new Error('signed-out'); }
  if (!r.ok) throw new Error('api ' + r.status);
  return r.json();
}

function startSync(project, role) {
  const canWrite = (k) => (role === 'admin' ? ADMIN_WRITE : CLIENT_WRITE).includes(SECTIONS[k]);
  const orig = Storage.prototype.setItem, origRemove = Storage.prototype.removeItem;
  const timers = {};
  function push(key) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      let v = null; try { v = JSON.parse(localStorage.getItem(key)); } catch (e) {}
      api(`project/${project}/${SECTIONS[key]}`, { method: 'PUT', body: JSON.stringify(v) })
        .then(() => document.dispatchEvent(new CustomEvent('sr-portal-saved', { detail: { key } })))
        .catch((e) => { console.warn('Portal save failed', key, e); document.dispatchEvent(new CustomEvent('sr-portal-save-failed', { detail: { key, error: String(e.message || e) } })); });
    }, 400);
  }
  Storage.prototype.setItem = function (k, v) { orig.call(this, k, v); if (this === localStorage && SECTIONS[k] && canWrite(k)) push(k); };
  Storage.prototype.removeItem = function (k) { origRemove.call(this, k); if (this === localStorage && SECTIONS[k] && canWrite(k)) push(k); };
  return { orig, origRemove };
}

async function pull(project, raw) {
  const doc = await api(`project/${project}`);
  let changed = false;
  for (const [key, section] of Object.entries(SECTIONS)) {
    const server = section in doc ? JSON.stringify(doc[section]) : null;
    const local = localStorage.getItem(key);
    if (server === null || server === 'null') { if (local !== null) { raw.origRemove.call(localStorage, key); changed = true; } }
    else if (server !== local) { raw.orig.call(localStorage, key, server); changed = true; }
  }
  return { doc, changed };
}

async function main() {
  try { await getSettings(); }
  catch (e) {                                       // Identity not turned on yet: stay in preview mode
    window.SRPortal = { mode: 'preview' };
    reveal(); document.dispatchEvent(new Event('sr-portal-ready')); return;
  }
  const user = await getUser();
  if (!user) { location.replace('login.html?next=' + encodeURIComponent(here + location.hash)); return; }
  const me = await api('me');
  if (need === 'admin' && me.role !== 'admin') { location.replace(me.role === 'client' ? 'index.html' : 'login.html?err=no-access'); return; }
  if (need === 'client' && me.role === 'none') { location.replace('login.html?err=no-project'); return; }
  const project = me.project || new URLSearchParams(location.search).get('project') || 'rusk';
  const raw = startSync(project, me.role);
  const { doc, changed } = await pull(project, raw);
  window.SRPortal = { mode: 'live', me, project, doc, api };

  // Page scripts read this browser's copy when they load; if the saved data was different, reload once so they show it.
  const flag = 'sr-sync-' + here;
  if (changed && !sessionStorage.getItem(flag)) { sessionStorage.setItem(flag, '1'); location.reload(); return; }
  sessionStorage.removeItem(flag);

  banner(me.role === 'admin' ? `Signed in as ${me.email} &middot; changes save for everyone` : 'Your choices save automatically', 'live');
  const slot = document.querySelector('.pt-user');
  if (slot && !slot.querySelector('[data-signout]')) {
    const a = document.createElement('a'); a.href = '#'; a.className = 'pt-signout'; a.dataset.signout = '1'; a.textContent = 'Sign out';
    slot.appendChild(a);
  }
  document.querySelectorAll('[data-signout], .pt-signout').forEach((a) => {
    if (a.textContent.trim().toLowerCase() !== 'sign out') return;
    a.addEventListener('click', async (e) => { e.preventDefault(); await logout().catch(() => {}); location.href = 'login.html'; });
  });
  reveal(); document.dispatchEvent(new Event('sr-portal-ready'));
}

main().catch((e) => { console.error(e); reveal(); });
