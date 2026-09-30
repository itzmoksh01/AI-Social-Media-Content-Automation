# Demo Runbook — Muse (brain) + Hugging Face (free) + Excel + IG/FB/YT

The live practical-demonstration flow for this project, as reconfigured on
2026-09-30 per the project owner's decisions. Engine selection lives in
`config/engine.json`. The original Higgsfield + Google Sheets + Claude
Code flow is unchanged and remains available as a fallback.

## What changed vs. the original design

| Part | Original | Demo flow |
|---|---|---|
| Brain / orchestrator | Claude Code CLI (`CLAUDE_CODE_OAUTH_TOKEN`, needs a paid Claude plan) | **Muse** (this assistant) follows `CLAUDE.md`'s creative steps directly — no Claude subscription needed. The owner's free Claude account and ChatGPT Go are not connected: neither provides the headless token this pipeline would need, and neither is required. |
| Reference image | Higgsfield | **FLUX.1-schnell** HF Space — `scripts/hf_image.py` (free) |
| Scene video | Higgsfield `kling3_0_turbo` (paid credits) | **LTX-Video distilled** HF Space — `scripts/hf_scene.py`, same CLI as `higgsfield_scene.py` (free, ZeroGPU quota) |
| Upscale | Higgsfield Bytedance 4K (paid) | **Local ffmpeg** lanczos to 1080x1920 — `scripts/upscale_local.py` (free; resampling, not AI super-resolution) |
| Input / tracking | Google Sheets + Apps Script bridge | **Excel `dashboard.xlsx`** — `scripts/excel_sync.py`, same columns + `Facebook Status` |
| Publishing | Instagram + YouTube (`scripts/publish.py`) | Instagram + **Facebook Page (new)** + YouTube, after human approval |

## Known free-tier limits (state these honestly in the demo)

- HF Spaces are 100% free but quota-bound: ZeroGPU gives a small daily
  GPU quota to anonymous callers, more to the account whose `HF_TOKEN`
  is set in `config/.env`. Queue waits are normal.
- LTX-Video distilled clips are max ~8s and generated at 576x1024, so a
  "30s" run is 3 chained scenes ≈ 24s before crossfades, delivered at
  1080x1920 after local upscale. Quality/consistency is below Kling.
- `config/theme.json` is still a placeholder, so demo runs are
  `GENERATION_MODE=test` (generic comedic content) until a real niche
  is decided.
- `assets/music/` folders are empty, so `mix_music.py` passes the video
  through without background music until tracks are added.

## Live demo script (in order)

1. **Show the Excel dashboard** (`dashboard.xlsx`, sheet `Sheet1`):
   row 2 is the Hulku demo row, Status = Pending.
2. **Claim the row**: `python scripts/excel_sync.py claim`
   → prints title/idea/aspect/run_folder; row becomes In Progress, 5%.
3. **Muse does the creative work** per `CLAUDE.md`: technique =
   Scene-Chaining (title has no storyboard phrase); read
   `config/characters/hulku.md` (locked character + outfit) and
   `rules.md`; write the 360° scene blueprint, the script (title,
   concept, emotion arc, per-scene beats + Hinglish dialogue lines
   ending in "re", mapped 1+2 / 3 / 4 onto 3 scenes), then the 3 scene
   prompts. Save as `storage/pending/{run_folder}/script.md`.
4. **Reference image**: `python scripts/hf_image.py --prompt "..." --out storage/pending/{run_folder}/reference.png` → Excel progress 20%.
5. **Scenes, chained**: for each scene —
   `python scripts/hf_scene.py --prompt "..." --out .../clips/sceneN.mp4 --start-image <reference.png or previous last frame>`
   then `python scripts/extract_last_frame.py` before the next scene.
   → Excel progress 40 / 60 / 80%.
6. **Captions**: OFF — owner decision 2026-09-30 (locked in
   `config/engine.json`: `"captions": false`). Skip caption burning.
7. **Upscale each clip**: `python scripts/upscale_local.py --in ... --out .../sceneN_upscaled.mp4` → progress 90%.
8. **Assemble**: `python scripts/concat_clips.py` (0.5s crossfade), then
   `python scripts/mix_music.py --mood playful` (passes through if no
   music tracks), then `python scripts/write_status.py`.
9. **Complete in Excel**: `python scripts/excel_sync.py complete --row 2 --video-url <public URL or local path for the demo>`; show the final
   video and the updated row.
10. **Approval gate**: nothing is published until the owner approves.
    On approval, publish with `scripts/publish.py` (Instagram Reel,
    Facebook Page video, YouTube Short) and write each platform's
    result back into the Excel row's status columns.

## Still needed from the owner before step 10 can run live

- `HF_TOKEN` (own Hugging Face account) for full free quota — the flow
  runs anonymously without it, with a smaller quota.
- New account email + tokens: `INSTAGRAM_ACCESS_TOKEN`,
  `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `FACEBOOK_PAGE_ID`,
  `FACEBOOK_PAGE_ACCESS_TOKEN`, `YOUTUBE_TOKEN` (see
  `config/.env.example`). Instagram/Facebook also need the final video
  at a public URL.
