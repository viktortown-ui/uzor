# QA checklist

- [ ] Email submit, resend, valid/invalid OTP, session restore/expiry and sign out.
- [ ] Legacy anonymous notice не обещает перенос ownership; `/join` требует real user.
- [ ] Intended route и query (`/map?delta=…`) восстановлены после входа.
- [ ] Open Perm RPC: unauthenticated/anonymous rejected; repeated real call makes one participant membership; disabled mapping rejected; RLS remains active.
- [ ] Desktop map 1920×1080, 1600×900, 1440×900, 1366×768, 1280×720, 1024×768, 901×800: edges equal workspace/viewport, no page overflow, inspector sibling opens/closes without MapLibre reconstruction.
- [ ] Mobile 900×800, 430×932, 412×915, 390×844, 375×812, 360×800, 320×700: canvas reaches sides and dock top; controls respect safe areas; cards/filter/PWA coexist.
- [ ] Five dock items fit at 320px with 44px targets and central Add.
- [ ] Settings sections, guide, onboarding replay, local-only clear confirmation and PWA control.
- [ ] Keyboard focus, headings, aria-current, alerts/status, reduced motion and dialog focus.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, both builds and PWA installability pass.
- [ ] Playwright visual artifact is uploaded; real iOS Safari and Android Chrome checks are recorded separately.
