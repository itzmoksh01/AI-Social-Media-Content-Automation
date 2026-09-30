"""Generates the run's single reference image via a free HF Space
(FLUX.1-schnell on ZeroGPU) - the free replacement for the reference-image
generation step the Higgsfield flow used.

Usage:
  python scripts/hf_image.py --prompt "..." --out storage/pending/{date}/reference.png \
      [--width 576] [--height 1024] [--seed 42] [--space black-forest-labs/FLUX.1-schnell]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hf_common import copy_result, predict_with_retry

DEFAULT_SPACE = "black-forest-labs/FLUX.1-schnell"


def generate_image(prompt, out_path, width=576, height=1024, seed=42, space=DEFAULT_SPACE):
    print(f"[hf_image] Requesting image from {space}: {prompt[:70]}...")
    result = predict_with_retry(
        space, "/infer",
        prompt,
        seed,
        False,  # randomize_seed - fixed seed keeps the character board reproducible
        width,
        height,
        4,  # num_inference_steps - FLUX.1-schnell is a 4-step distilled model
    )
    copy_result(result[0] if isinstance(result, (list, tuple)) else result, out_path)
    print(f"[hf_image] Saved to {out_path}")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=576)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--space", default=DEFAULT_SPACE)
    args = parser.parse_args()
    generate_image(args.prompt, args.out, args.width, args.height, args.seed, args.space)
