"""Shared helpers for the Hugging Face (free) generation engine.

The pipeline's original engine was the paid Higgsfield CLI
(scripts/higgsfield_scene.py, scripts/upscale_clip.py). The HF engine
replaces it with public Hugging Face ZeroGPU Spaces, called through
gradio_client:

  - Reference image : black-forest-labs/FLUX.1-schnell   (scripts/hf_image.py)
  - Scene video     : Lightricks/ltx-video-distilled     (scripts/hf_scene.py)
  - Upscale         : local ffmpeg, no cloud             (scripts/upscale_local.py)

Cost: 100% free. ZeroGPU Spaces consume the *caller's* daily GPU quota -
anonymous calls get a small quota, calls with HF_TOKEN set (the project
owner's own Hugging Face token, see config/.env) get the account's full
free quota. Quota resets daily.

Environment note: gradio_client/httpx choke on the bracketed-IPv6 entries
some proxy setups put in NO_PROXY ("Invalid port: ':1]'"), so we normalise
NO_PROXY before creating a client.
"""
import os
import shutil


def sanitize_proxy_env():
    for key in ("NO_PROXY", "no_proxy"):
        val = os.environ.get(key, "")
        if "[" in val:
            os.environ[key] = "localhost,127.0.0.1"


def hf_token():
    return (
        os.environ.get("HF_TOKEN")
        or os.environ.get("HUGGINGFACE_TOKEN")
        or os.environ.get("HUGGING_FACE_HUB_TOKEN")
        or None
    )


def make_client(space_id):
    """Create a gradio_client Client for a Space, using HF_TOKEN if set.

    Timeouts are raised well above the library defaults: a sleeping
    ZeroGPU Space can take a while to wake, and the stock read timeout
    aborts the queue-join request before it gets a chance.
    """
    sanitize_proxy_env()
    import httpx
    from gradio_client import Client

    return Client(
        space_id,
        token=hf_token(),
        verbose=False,
        httpx_kwargs={"timeout": httpx.Timeout(timeout=600.0, connect=60.0)},
    )


def predict_with_retry(space_id, api_name, *args, attempts=3, wait_seconds=25):
    """client.predict() with retries - the first call to a cold Space
    often times out while it wakes; later attempts usually succeed."""
    import time

    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            client = make_client(space_id)
            return client.predict(*args, api_name=api_name)
        except Exception as e:  # queue-join timeouts, 502/503 while waking, etc.
            last_error = e
            print(f"[hf] {space_id} {api_name} attempt {attempt}/{attempts} failed: "
                  f"{type(e).__name__}: {str(e)[:160]}")
            if attempt < attempts:
                print(f"[hf] Waiting {wait_seconds}s for the Space to wake, then retrying...")
                time.sleep(wait_seconds)
    raise RuntimeError(
        f"Hugging Face Space {space_id} did not respond after {attempts} attempts"
    ) from last_error


def result_file_path(result):
    """gradio_client returns file results as dicts or plain paths."""
    if isinstance(result, dict):
        if "video" in result:
            video = result["video"]
            return video.get("path") if isinstance(video, dict) else video
        return result.get("path")
    if isinstance(result, (list, tuple)):
        return result_file_path(result[0])
    return result


def copy_result(result, out_path):
    src = result_file_path(result)
    if not src or not os.path.exists(src):
        raise RuntimeError(f"Hugging Face Space returned no usable file: {result!r}")
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    if os.path.abspath(src) != os.path.abspath(out_path):
        shutil.copyfile(src, out_path)
    return out_path
