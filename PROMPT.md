# PROMPT.md — Master Lock File (V2, consistency-locked)

Project: Social-Content-Automation
Video: Dog and Cat Doing Marriage at Indian Wedding Hall
Run: storage/pending/2026-10-01-row2-v2/
Engine: Hugging Face Lightricks/ltx-video-distilled (image-to-video), local ffmpeg upscale
Format: Vertical 9:16, 3 scenes x ~8s, hard cuts, delivered 1080x1920 @ 30fps

This file is the single source of truth for generation. Every scene prompt is built
from the locked blocks below — do not edit them per-scene.

## CHARACTER LOCK
Bruno — small golden-brown cartoon dog, floppy ears, round black nose, cream sherwani with four gold buttons, red-and-gold striped turban with a white feather kalgi, red dupatta over his left shoulder. Always screen-LEFT. Mimi — small white cartoon cat, big amber eyes, pink inner ears, red bridal lehenga with gold embroidery, sheer red dupatta over her head, gold necklace and gold maang tikka. Always screen-RIGHT.

## STYLE LOCK
One single style for every scene: cute 3D Pixar-style render. Never 2D, never flat illustration, never anime.

## ENVIRONMENT LOCK
Same grand Indian wedding hall stage in every scene: orange marigold + pink rose arch directly behind the couple, red and gold drapes, one crystal chandelier above-front, warm golden light, round patterned rug under the couple, polished floor.

## CAMERA LOCK
Locked-off static tripod camera, medium shot, camera completely still — no push-in, no pull-back, no pan, no zoom, no drift, no shake. Characters stay planted in the same positions; only small upper-body actions.

## CONTINUITY RULES
- Same master reference image as the start frame for ALL scenes (NO scene chaining — never use one scene's last frame as the next scene's start).
- Same seed 777 for all scenes.
- Same negative prompt for all scenes (below).
- Hard cuts between scenes (no crossfade).
- Master reference: reference.png in this run folder — an exact copy of the V1 reference (storage/pending/2026-09-30-row2/reference.png). Do NOT generate a new reference; this image is the identity anchor.

## NEGATIVE PROMPT (exact, used for every scene)
worst quality, blurry, jittery, distorted, morphing faces, face change, character identity change, different character, outfit change, outfit color change, species change, extra limbs, warped hands, 2D cartoon, flat illustration, anime, style change, camera movement, camera drift, camera pan, camera zoom, camera shake, background change, new location, watermark, text

## COMMON PROMPT BLOCK (prepended to every scene action)
Cute 3D Pixar-style cartoon render, the exact same two characters as the start image, identical faces, identical fur colours, identical outfits with identical colours, vertical video. Locked-off static tripod camera, medium shot, camera completely still, no movement, no zoom, no pan. Same grand Indian wedding hall stage: orange marigold and pink rose arch directly behind the couple, red and gold drapes, crystal chandelier above, warm golden light, round patterned rug under the couple. Bruno the small golden-brown dog groom with floppy ears and round black nose, cream sherwani with four gold buttons, red-and-gold striped turban with white feather kalgi and red dupatta over his left shoulder, stands screen-LEFT. Mimi the small white cat bride with big amber eyes and pink inner ears, red bridal lehenga with gold embroidery, sheer red dupatta over her head, gold necklace and maang tikka, stands screen-RIGHT. Both characters stay standing in the same spots on the rug for the whole scene, feet planted, only small gentle upper-body movements, smiling at the camera, mouths moving as if speaking Hindi. Family-friendly, no text.

## SCENE ACTIONS
- Scene 1: The couple smiles and waves their front paws happily at the camera in place, gentle joyful bouncing in place, a few flower petals fall slowly around them.
- Scene 2: Bruno lifts an orange marigold garland and gently places it over Mimi's head; the garland comically slips over Bruno's own ears for a moment and both giggle; then Mimi places a marigold garland over Bruno's head. Small arm movements only.
- Scene 3: The couple holds front paws together, smiles at the camera and waves together while golden confetti and flower petals fall around them; gentle happy swaying in place.

## HINDI DIALOGUE
Note: the generated video is silent; Hindi dialogue audio is produced and mixed separately by the parent agent. The on-screen mouth movement in the prompts supports this dub.
- Scene 1 — Bruno: "नमस्ते सबको! आज मेरी और मीमी की शादी है!"
- Scene 2 — Mimi: "ब्रूनो, जल्दी से वरमाला पहनाओ ना!" then Bruno: "अरे! वरमाला तो मेरे कानों पर अटक गई!"
- Scene 3 — Mimi: "अब हम हमेशा साथ रहेंगे!" then Bruno: "शादी मुबारक हो!"

## GENERATION SETTINGS (locked)
- --start-image: this run's reference.png (same for all 3 scenes)
- --seed: 777 (all scenes)
- --duration: 8 (all scenes)
- --aspect-ratio: 9:16 (all scenes)
- --negative: the locked NEGATIVE PROMPT above (all scenes)

## IMPLEMENTATION NOTE (2026-10-01, verified during V2 run)
The scene prompts were assembled as ACTION-FIRST + COMMON block (instead of COMMON + ACTION). The text content is identical to the locked COMMON/ACTION blocks above — only the order changed. Reason, verified empirically: with COMMON first (~1150 chars of lock text), the LTX prompt encoder truncates the prompt tail, so the scene ACTION at the end was silently dropped and all three scenes rendered byte-identical. ACTION-FIRST produces distinct, on-action scenes while keeping every locked block verbatim. Same seed (777), same reference image, same negative prompt, no scene chaining.

## QUALITY BENCHMARK (owner-approved 2026-10-02)
Reference video: storage/pending/2026-10-01-row2-v2/final_v2.mp4 (24.1s, 1080x1920, 30fps, H.264+AAC)
Reference still: docs/v2-quality-benchmark.png
Every future video generated by the sheet pipeline must match this bar: identical character faces in every scene, identical outfits, one consistent 3D cartoon style with no 2D drift, locked static camera, no gibberish text or caption strips, Hindi voiceover with consistent male+female voices, captions OFF. This benchmark was set by the owner after reviewing V2 start-to-end.
