#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d "dashboard" ]]; then
  echo "ERROR: 'dashboard/' folder not found at repo root" >&2
  exit 1
fi

if [[ ! -d "outputs" ]]; then
  echo "ERROR: 'outputs/' folder not found at repo root" >&2
  exit 1
fi

rm -rf dist
mkdir -p dist

cp -R dashboard dist/dashboard
cp -R outputs dist/outputs

# Minimal landing page so '/' works on Netlify.
cat > dist/index.html <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Global Food Trade Network Analysis</title>
    <meta http-equiv="refresh" content="0; url=dashboard/" />
    <link rel="canonical" href="dashboard/" />
  </head>
  <body>
    <p>Redirecting to <a href="dashboard/">dashboard/</a>…</p>
  </body>
</html>
HTML

# Netlify redirects (works with and without trailing slash).
cat > dist/_redirects <<'TXT'
/ /dashboard/ 302
TXT
