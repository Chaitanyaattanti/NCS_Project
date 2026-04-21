# NCS_Project

Global Food Trade Network Analysis (Networks and Complex Systems).

## Dashboard (static)
- Source: `dashboard/`
- Plots/assets: `outputs/`
- The dashboard uses relative paths like `../outputs/...` so `dashboard/` and `outputs/` must be siblings.

## Netlify deploy (free)
This repo includes `netlify.toml`.
- Build command: `bash scripts/netlify_build.sh`
- Publish directory: `dist/`

Locally:
```bash
bash scripts/netlify_build.sh
```

## Submission folder (no absolute paths)
To generate a clean folder you can zip and submit:
```bash
bash scripts/make_submission.sh
```
This creates `SUBMISSION/dashboard/` and `SUBMISSION/outputs/`.

## Report (LaTeX)
- Source: `report.tex`
- Figures are included from `outputs/`

Compile (requires MacTeX/TinyTeX):
```bash
pdflatex report.tex
pdflatex report.tex
```
