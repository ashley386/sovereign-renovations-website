// Keeps the sign-in cookie the server reads in step with the saved sign-in in this browser.
// The two can drift apart (one renewed, one expired), which used to bounce people between a page and the sign-in page.
import './vendor/identity.js';
const readCookie = (n) => { const m = new RegExp('(?:^|; )' + n + '=([^;]*)').exec(document.cookie); return m ? decodeURIComponent(m[1]) : null; };
const expOf = (jwt) => { try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (e) { return 0; } };
const setCookies = (jwt, refresh) => {
  document.cookie = `nf_jwt=${encodeURIComponent(jwt)}; path=/; secure; samesite=lax; max-age=31536000`;
  if (refresh) document.cookie = `nf_refresh=${encodeURIComponent(refresh)}; path=/; secure; samesite=lax; max-age=31536000`;
};
export function savedUser() {
  try { return window.GoTrue ? new window.GoTrue({ APIUrl: location.origin + '/.netlify/identity', setCookie: false }).currentUser() : null; } catch (e) { return null; }
}
// Returns true when this browser now has a good sign-in the server will accept.
export async function renew(force) {
  const u = savedUser();
  if (!u) return false;
  try {
    const t = u.tokenDetails() || {};
    let exp = t.expires_at || 0; if (exp && exp < 1e12) exp *= 1000;
    let jwt = t.access_token;
    if (force || !jwt || exp - Date.now() < 2 * 60 * 1000) jwt = await u.jwt(true);
    setCookies(jwt, (u.tokenDetails() || {}).refresh_token); // always rewrite so it survives closing Chrome
    return true;
  } catch (e) { return false; }
}
// Forget the sign-in in this browser (used when it can't be renewed, so the sign-in form shows instead of looping).
export function forget() {
  try { localStorage.removeItem('gotrue.user'); } catch (e) {}
  document.cookie = 'nf_jwt=; path=/; secure; samesite=lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'nf_refresh=; path=/; secure; samesite=lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
