# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [1.1.0] — 2026-09-30

### Added
- **Free Hugging Face generation engine** — FLUX.1-schnell reference images and
  LTX-Video scene generation on the free ZeroGPU quota (`scripts/hf_common.py`,
  `scripts/hf_image.py`, `scripts/hf_scene.py`), with local ffmpeg upscaling to
  1080×1920 (`scripts/upscale_local.py`).
- **Excel dashboard control plane** — `dashboard.xlsx` with content rows,
  status/progress sync (`scripts/excel_sync.py`,
  `scripts/create_excel_dashboard.py`); supports 15s/30s/45s/60s durations and
  9:16 / 16:9 aspect ratios.
- **Facebook Page publishing** via the Graph API `/videos` endpoint
  (`scripts/publish.py`), alongside Instagram and YouTube.
- Engine configuration in `config/engine.json` and a safe, fully documented
  `config/.env.example` (all values blank; real tokens stay in `config/.env`).
- Setup and demo documentation: `docs/ACCOUNT_SETUP_STEPS.md`,
  `docs/DEMO_RUNBOOK.md`.
- Project README, MIT `LICENSE`, and this changelog.

## [1.0.0] — 2026-09-30

### Added
- Initial release: Google Sheets–driven cartoon-short pipeline via Higgsfield,
  human approval flow (email + GitHub issue), Instagram and YouTube publishing,
  and GitHub Actions workflows for generation and publishing.
