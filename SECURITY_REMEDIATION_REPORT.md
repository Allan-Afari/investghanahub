# Security Scan Remediation Report
**Date:** 2026-01-03  
**Scope:** Backend API (5001) and Frontend Dev Server (5173)  
**Tools:** Nikto v2.1.5 (deep scans), Nmap 7.80 (http-enum, http-headers, http-security-headers)  
**Target IP:** 192.168.8.156 (LAN access from WSL)

---

## Executive Summary
- **Overall posture:** Strong security headers present on both services. No critical vulnerabilities detected.
- **Key concerns:** 
  - Frontend dev server leaks ETags (informational; acceptable in dev).
  - Frontend dev server blocks unlisted Host headers (Vite behavior).
- **Recommendations:** Minor hardening for production; current dev setup is acceptable.

---

## Backend API (5001)

### Findings
- **Security headers present:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, COOP, CORP, X-DNS-Prefetch-Control, X-Download-Options, X-Permitted-Cross-Domain-Policies.
- **Rate limiting headers** present and functional.
- **No CGI directories** found.
- **No obvious vulnerabilities** detected by Nikto or Nmap scripts.

### Recommendations
- **ETag disabled:** Already implemented (`app.disable('etag')`). Good.
- **CSP note:** `connect-src` currently allows `https:` only. In production, lock to your specific domains to reduce attack surface.
- **HSTS:** Ensure your production domain uses HTTPS and preload is appropriate.
- **Rate limiting:** Current limits (100/15m) are reasonable for dev; consider higher limits or user-based limits in production.

---

## Frontend Dev Server (5173)

### Findings
- **Security headers present:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection.
- **ETag leak:** Present (informational). Acceptable for dev; ensure production web server disables ETags if desired.
- **Vite Host blocking:** Requests from unlisted hosts are blocked with 403. This is expected and secure.
- **Nikto informational:** `/css` flagged as “interesting” (standard static asset).

### Recommendations
- **Production deployment:** Serve via a web server (Nginx/Caddy) where you can:
  - Disable ETags (`etag off;` in Nginx).
  - Tighten CSP to remove `unsafe-inline`/`unsafe-eval` if possible.
  - Ensure `connect-src` points to production backend only.
- **AllowedHosts:** Keep Vite’s `allowedHosts` restrictive; add only specific test domains if needed.

---

## Cross-Service Observations
- **CSP alignment:** Frontend `connect-src` includes `http://localhost:5001` and LAN IP, which is correct for dev.
- **CORS:** Backend allows necessary origins and methods; keep this tight in production.

---

## Action Items (Priority)
1. **Production CSP hardening** (Medium)
   - Remove `unsafe-inline`/`unsafe-eval` from frontend CSP if feasible.
   - Pin `connect-src` to production backend URL.
2. **Production web server ETag** (Low)
   - Disable ETags in Nginx/Caddy if you want to eliminate the informational finding.
3. **HSTS preload** (Low)
   - Submit domain to HSTS preload list after HTTPS is stable.
4. **Rate limiting** (Low)
   - Evaluate production rate limits; consider user-based limits.

---

## Artifacts
- `nikto_backend_deep.txt` — Nikto deep scan backend
- `nikto_frontend_deep.txt` — Nikto deep scan frontend
- `nmap_deep.txt` — Nmap http-enum/headers/security-headers scan

---

**Conclusion:** No critical issues. The application demonstrates a strong security baseline for development. Focus on production CSP tightening and standard web server hardening at deployment.
