#!/usr/bin/env python3
"""ResurGo v2 — vocal coach pre-rendered with same Edge neural voices as Histoire.

No synthesis calls occur during workouts. Never replace v1 or user-approved voice
identities silently. Explicit audition and text-review required before release.
"""
import argparse, asyncio, hashlib, json, re
from pathlib import Path
from edge_tts import Communicate

ROOT=Path(__file__).resolve().parents[1]
TEXT=ROOT/"docs/evolution-coach-multisport-2026/07_CATALOGUE_VOCAL.md"
PHRASE=re.compile(r'^\s*(\d{1,3})\.\s+[«"](.*?)[»"]\s*$',re.M)
V={
 "feminine":{"voiceId":"fr-FR-feminine-vivienne-v2","providerVoiceId":"fr-FR-VivienneMultilingualNeural"},
 "masculine":{"voiceId":"fr-FR-masculine-remy-v2","providerVoiceId":"fr-FR-RemyMultilingualNeural"}
}
def settings(number):
  if number in range(17,33) or number in range(33,41) or number in range(75,81):
    return {"rate":"-10%","pitch":"-2Hz","volume":"+0%","tone":"gentle_reassurance"}
  if number in range(65,75):
    return {"rate":"-3%","pitch":"+1Hz","volume":"+1%","tone":"congratulation"}
  if number in range(41,49):
    return {"rate":"-6%","pitch":"+0Hz","volume":"+0%","tone":"clear_brief"}
  return {"rate":"-7%","pitch":"+0Hz","volume":"+0%","tone":"warm_natural"}
def checked_phrases():
  found=[{"number":int(n),"id":f"phrase_{int(n):03d}","text":s.strip()} for n,s in PHRASE.findall(TEXT.read_text("utf8")) if 1<=int(n)<=80]
  found=sorted(found,key=lambda x:x["number"])
  if [x["number"] for x in found]!=list(range(1,81)):raise SystemExit("missing or duplicated phrase")
  for x in found:
    s=x["text"]
    if len(s)<8 or len(s)>240:raise SystemExit(f"invalid phrase length: {x['id']}")
    # Changes to any negation must be reviewed: never shorten or join words
    if re.search(r"\b(?:ne|n'|pas|jamais|rien|plus|aucun)\b",s,re.I):
      x["criticalNegation"]=True
  return found
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
async def main():
  ap=argparse.ArgumentParser()
  ap.add_argument("--out",default=str(ROOT/"static/voice/fr-FR/v2"))
  ap.add_argument("--jobs",type=int,default=3)
  args=ap.parse_args()
  target=Path(args.out)
  target.mkdir(parents=True,exist_ok=True)
  phrases=checked_phrases()
  man={
    "format":"resurgo-pregenerated-voice-pack","packId":"fr-FR-v2-edge",
    "locale":"fr-FR","engine":"edge-tts","identitySource":"sicho95/histoire/config/voice-direction.json",
    "qualityStatus":"candidate-awaiting-user-audition","voiceIdentityLocked":True,
    "voices":{},"phrases":phrases,"files":{}
  }
  queue=asyncio.Semaphore(max(1,min(args.jobs,4)))
  async def render(kind,voice,phrase):
    n=phrase["number"]; params=settings(n)
    out=target/kind/(phrase["id"]+".mp3")
    out.parent.mkdir(parents=True,exist_ok=True)
    async with queue:
      for attempt in range(4):
        try:
          await Communicate(text=phrase["text"],voice=voice["providerVoiceId"],
            rate=params["rate"],pitch=params["pitch"],volume=params["volume"]).save(str(out))
          if out.stat().st_size<2000:raise RuntimeError("empty audio")
          break
        except Exception:
          if attempt==3:raise
          await asyncio.sleep(1.25*(attempt+1))
      man["files"][kind+"/"+phrase["id"]]={
        "src":kind+"/"+out.name, "bytes":out.stat().st_size,"sha256":sha(out),
        "speakerIdentity":voice["voiceId"],"providerVoiceId":voice["providerVoiceId"],
        "text":phrase["text"],"textSha256":hashlib.sha256(phrase["text"].encode()).hexdigest(),
        "tuning":params, "criticalNegation":phrase.get("criticalNegation",False)
      }
  for k,v in V.items():
    man["voices"][k]={**v,"engine":"edge-tts","locale":"fr-FR",
      "format":"mp3","source":"Histoire project voice identity"}
  await asyncio.gather(*(render(k,v,p) for k,v in V.items() for p in phrases))
  man["files"]={k:man["files"][k] for k in sorted(man["files"])}
  (target/"manifest.json").write_text(json.dumps(man,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  print(f"generated {len(man['files'])} files in {target}")
if __name__=="__main__":
  asyncio.run(main())
