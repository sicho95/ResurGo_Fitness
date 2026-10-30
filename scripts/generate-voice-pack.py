#!/usr/bin/env python3
"""Generate ResurGo's stable voice assets from approved-ish phrase candidates.

NEVER overwrite a reviewed voice identity silently. The current 80 phrases are
candidate content and speaker identities are provisional until listening review.
"""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
import wave
from datetime import datetime, timezone
from pathlib import Path
from piper import PiperVoice

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/evolution-coach-multisport-2026/07_CATALOGUE_VOCAL.md"
DEFAULT_OUT = ROOT / "static/voice/fr-FR/v1"
VOICES = {
    "feminine": {
        "voiceId": "fr-FR-feminine-siwis-v1", "engine": "piper-tts",
        "model": "fr_FR-siwis-medium", "speakerId": 0,
        "license": "CC BY 4.0", "attribution": "Siwis, dataset: University of Edinburgh corpus",
        "licenseSource": "https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/siwis/medium/MODEL_CARD",
    },
    "masculine": {
        "voiceId": "fr-FR-masculine-upmc-v1", "engine": "piper-tts",
        "model": "fr_FR-upmc-medium", "speakerId": 0,
        "license": "CC BY-SA 4.0", "attribution": "UPMC Pierre corpus",
        "licenseSource": "https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/upmc/medium/MODEL_CARD",
    },
}
QUOTE = re.compile(r'^\s*(\d{1,3})\.\s+[«"](.*?)[»"]\s*$', re.M)


def load_phrases():
    content = SOURCE.read_text("utf-8")
    result = []
    for number, line in QUOTE.findall(content):
        number = int(number)
        if 1 <= number <= 80:
            result.append({"id": f"phrase_{number:03d}", "number": number, "text": line.strip()})
    if len(result) != 80 or len({p["id"] for p in result}) != 80:
        raise ValueError(f"Expected 80 unique candidate phrases; found {len(result)}")
    return sorted(result, key=lambda p: p["number"])


def digest_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", default=".", help="directory containing .onnx and .onnx.json")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--limit", type=int, default=80, help="for initial smoke test")
    args = parser.parse_args()
    target = Path(args.out)
    target.mkdir(parents=True, exist_ok=True)
    phrases = load_phrases()[:args.limit]
    manifest = {
        "format": "resurgo-pregenerated-voice-pack",
        "packId": "fr-FR-v1",
        "revision": "draft-2026-10-30",
        "locale": "fr-FR",
        "productionMethod": "offline-neural-tts",
        "qualityStatus": "candidate-not-reviewed-by-user",
        "sourceDocument": str(SOURCE.relative_to(ROOT)),
        "voices": {},
        "phrases": phrases,
        "files": {},
    }
    for kind, voice_config in VOICES.items():
        model_path = Path(args.models) / (voice_config["model"] + ".onnx")
        conf_path = Path(str(model_path) + ".json")
        if not model_path.exists() or not conf_path.exists():
            raise FileNotFoundError(f"Missing model/config for {kind}: {model_path}")
        model_digest = digest_file(model_path)
        config_digest = digest_file(conf_path)
        voice = PiperVoice.load(str(model_path))
        manifest["voices"][kind] = {
            **voice_config,
            "modelSha256": model_digest,
            "configSha256": config_digest,
            "synthesisConfig": {"speakerId": voice_config["speakerId"],
                                "lengthScale": 1.0, "noiseScale": 0.667,
                                "noiseWScale": 0.8},
        }
        destination = target / kind
        destination.mkdir(exist_ok=True)
        for index, phrase in enumerate(phrases, 1):
            path = destination / (phrase["id"] + ".m4a")
            with tempfile.TemporaryDirectory() as t:
                wav = Path(t) / "tmp.wav"
                with wave.open(str(wav), "wb") as audio:
                    voice.synthesize_wav(phrase["text"], audio)
                subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                                "-i", str(wav), "-vn", "-c:a", "aac", "-b:a", "64k",
                                "-ac", "1", str(path)], check=True)
            manifest["files"][kind + "/" + phrase["id"]] = {
                "src": f"{kind}/{path.name}", "sha256": digest_file(path),
                "bytes": path.stat().st_size,
                "speakerIdentity": voice_config["voiceId"], "text": phrase["text"],
            }
            if index % 10 == 0:
                print(f"{kind}: {index}/{len(phrases)}")
    (target / "manifest.json").write_text(json.dumps(
        manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", "utf-8")
    print("voice pack", target, "files:", len(manifest["files"]))


if __name__ == "__main__":
    main()
