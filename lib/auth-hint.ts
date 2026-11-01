/**
 * A display-only hint of whether the visitor is signed in, so the header shows Sign in or the
 * settings gear on the first paint instead of after Clerk loads. It reads Clerk's readable
 * `__client_uat` cookie (0 when signed out), the same signal Clerk's middleware checks.
 * Never used for access: every protected route and API still checks the session on the server.
 */
export const AUTH_HINT_SCRIPT = `(function(){try{document.documentElement.dataset.auth=/(?:^|; )__client_uat(?:_[^=]*)?=[1-9]/.test(document.cookie)?"in":"out"}catch(e){}})()`;

/**
 * Shows one of the two header controls from the hint. Inline in <head> (not Tailwind), so the
 * rule is there on the first paint and can't go missing from a stale stylesheet. Without a hint
 * (no script ran), Sign in shows.
 */
export const AUTH_HINT_CSS = `[data-auth="in"] .auth-signed-out{display:none!important}html:not([data-auth="in"]) .auth-signed-in{display:none!important}`;
