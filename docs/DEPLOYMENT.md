# Deployment

## GitHub Pages
1. Repository Settings → Pages → Source: GitHub Actions.
2. Repository Settings → Secrets and variables → Actions → Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Push в `main` запустит `.github/workflows/deploy-pages.yml`.

Workflow не запускает SQL migrations и не использует service role.
