"""Generates one video scene via a free Hugging Face ZeroGPU Space
(Lightricks/ltx-video-distilled) and saves it locally.

Drop-in replacement for scripts/higgsfield_scene.py - same command-line
interface, so the rest of the pipeline (CLAUDE.md flow, scene chaining via
extract_last_frame.py, concat_clips.py, mix_music.py) is unchanged:

  python scripts/hf_scene.py --prompt "..." --out clips/scene1.mp4 \
      [--duration 8] [--aspect-ratio 9:16] [--start-image frame.jpg] [--seed 42]

Free-tier realities (verified against the live Space on 2026-09-30):
  - The Space's per-clip duration range is 0.3-8.5 seconds, so a requested
    10s scene is clamped to 8s. A 3-scene run therefore produces a ~24s
    video before crossfades, not 30s.
  - Generation size is kept at 576x1024 (9:16) / 1024x576 (16:9) to stay
    inside the free daily ZeroGPU quota; upscale to 1080x1920 afterwards
    with scripts/upscale_local.py (free, local ffmpeg).
  - ZeroGPU quota is per HF account per day (anonymous = small quota).
    Set HF_TOKEN in config/.env to use the project owner's own quota.
"""
import argparse
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hf_common import copy_result, predict_with_retry

DEFAULT_SPACE = "Lightricks/ltx-video-distilled"
DEFAULT_NEGATIVE = (
    "worst quality, inconsistent motion, blurry, jittery, distorted, "
    "morphing faces, extra limbs, warped hands, character identity change, "
    "outfit change, watermark, text"
)
MAX_DURATION = 8.0  # Space slider max is 8.5; keep margin for quota safety

SIZES = {"9:16": (576, 1024), "16:9": (1024, 576)}


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=width,height:format=duration",
         "-of", "default=noprint_wrappers=1", path],
        capture_output=True, text=True,
    )
    return out.stdout.strip().replace("\n", " ")


def generate_scene(prompt, out_path, duration=8, aspect_ratio="9:16",
                   start_image=None, seed=42, space=DEFAULT_SPACE,
                   negative=DEFAULT_NEGATIVE):
    width, height = SIZES.get(aspect_ratio, SIZES["9:16"])
    duration = max(0.3, min(float(duration), MAX_DURATION))

    if start_image:
        from gradio_client import handle_file

        print(f"[hf_scene] I2V via {space} ({width}x{height}, {duration}s): {prompt[:70]}...")
        result = predict_with_retry(
            space, "/image_to_video",
            prompt, negative, handle_file(start_image), None,
            height, width, "image-to-video", duration, 9,
            seed, False, 1, True,
        )
    else:
        print(f"[hf_scene] T2V via {space} ({width}x{height}, {duration}s): {prompt[:70]}...")
        result = predict_with_retry(
            space, "/text_to_video",
            prompt, negative, None, None,
            height, width, "text-to-video", duration, 9,
            seed, False, 1, True,
        )

    video = result[0] if isinstance(result, (list, tuple)) else result
    copy_result(video, out_path)
    print(f"[hf_scene] Saved to {out_path} | {probe(out_path)}")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--duration", type=float, default=8)
    parser.add_argument("--aspect-ratio", default="9:16")
    parser.add_argument("--resolution", default=None,
                        help="Accepted for interface compatibility with "
                             "higgsfield_scene.py; HF size is fixed per aspect ratio.")
    parser.add_argument("--start-image", default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--space", default=DEFAULT_SPACE)
    parser.add_argument("--negative", default=DEFAULT_NEGATIVE,
                        help="Negative prompt; defaults to DEFAULT_NEGATIVE.")
    args = parser.parse_args()
    generate_scene(args.prompt, args.out, args.duration, args.aspect_ratio,
                   args.start_image, args.seed, args.space, args.negative)
