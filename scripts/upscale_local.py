"""Free, local replacement for scripts/upscale_clip.py (which used the
paid Higgsfield Bytedance upscale): scales a clip to the target delivery
size with ffmpeg's lanczos scaler and normalises fps.

Note the honest trade-off: this is high-quality resampling, not AI
super-resolution - it makes the file the right size for Instagram /
Facebook / YouTube delivery, it does not invent new detail the way the
Higgsfield upscale did.

Usage:
  python scripts/upscale_local.py --in clips/scene1.mp4 --out clips/scene1_upscaled.mp4 \
      [--width 1080] [--height 1920] [--fps 30]
"""
import argparse
import os
import subprocess


def upscale_local(in_path, out_path, width=1080, height=1920, fps=30):
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    vf = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase:flags=lanczos,"
        f"crop={width}:{height},fps={fps},format=yuv420p"
    )
    print(f"[upscale_local] {in_path} -> {out_path} ({width}x{height}@{fps})")
    subprocess.run(
        ["ffmpeg", "-y", "-i", in_path, "-vf", vf,
         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "128k", out_path],
        check=True, capture_output=True, text=True,
    )
    print(f"[upscale_local] Saved to {out_path}")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_path", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=1080)
    parser.add_argument("--height", type=int, default=1920)
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()
    upscale_local(args.in_path, args.out, args.width, args.height, args.fps)
