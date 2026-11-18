#!/usr/bin/env python3
"""Weekly Culture Scout publisher. Requires OPENAI_API_KEY GitHub Actions secret."""
import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

today=dt.datetime.now(dt.timezone.utc).date()
end=today+dt.timedelta(days=21)
prompt=f"""Today is {today.isoformat()}. Research the next 21 days, through {end.isoformat()}, for real, distinctive cultural events around Honor Oak Park, SE23, southeast London (Forest Hill, Sydenham, Brockley, Peckham, Dulwich, Crystal Palace, Deptford, Lewisham, Greenwich, Blackheath). Include theatre, intelligent standup/comedy (especially Radio 4 comedians, The Horne Section, Romesh Ranganathan, Alan Carr, Bill Bailey when genuinely listed), jazz, music, history, heritage, oddities and strong family events appropriate for a 12-year-old (not overly childish). Prefer 10-15 distinctive events, prioritise official organiser sources, and DO NOT invent events, prices, age suitability, or booking URLs. Each event must have a real accessible official event or venue URL, source URL, YYYY-MM-DD start date, venue and area. For uncertain prices use 'Check organiser'. family=true only when age guidance is confirmed suitable for 12-year-olds; otherwise false and state unknown. Include a few editor's picks (featured=true). Exclude events that have finished or start outside the period. Output ONLY a JSON object with 'events' array, no Markdown. Each event object has EXACTLY: title,date,venue,area,category,price,url,description,note,family,featured,sourceUrl. Categories one of Comedy, Theatre, Music, Art, Heritage, Oddities, Film. Include a brief honest note about age guidance and urgency. Verify facts using web search before inclusion."""
payload={"model":os.getenv("OPENAI_MODEL","gpt-4.1-mini"),"tools":[{"type":"web_search_preview"}],"input":[{"role":"user","content":prompt}],"max_output_tokens":6000}
key=os.environ.get("OPENAI_API_KEY")
if not key:
    sys.exit("OPENAI_API_KEY is missing; keeping the existing edition unchanged.")
req=urllib.request.Request("https://api.openai.com/v1/responses",data=json.dumps(payload).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},method="POST")
with urllib.request.urlopen(req,timeout=180) as res:
    response=json.load(res)
parts=[]
for block in response.get("output",[]):
    for item in block.get("content",[]):
        if item.get("type")=="output_text":
            parts.append(item.get("text",""))
raw="\n".join(parts).strip()
if raw.startswith("```"):
    raw=re.sub(r"^\x60{3}(?:json)?\s*|\s*\x60{3}$","",raw).strip()
obj=json.loads(raw)
assert isinstance(obj.get("events"),list),"Missing events array"
valid=[]
seen=set()
allowed={"Comedy","Theatre","Music","Art","Heritage","Oddities","Film"}
for e in obj["events"]:
    if not isinstance(e,dict):
        continue
    try:
        d=dt.date.fromisoformat(e["date"])
        link=e["url"]
        source=e.get("sourceUrl",link)
        if not (today<=d<=end and urlparse(link).scheme=="https" and urlparse(source).scheme=="https"):
            continue
        if e.get("category") not in allowed or not all(e.get(k) for k in ("title","venue","area","description")):
            continue
        identity=(e["title"].casefold(),e["date"])
        if identity in seen:
            continue
        seen.add(identity)
        valid.append({k:e.get(k) for k in ("title","date","venue","area","category","price","url","description","note","family","featured","sourceUrl")})
    except (ValueError,KeyError,TypeError):
        continue
if len(valid)<5:
    sys.exit(f"Only {len(valid)} valid events; refusing to replace last edition.")
# Retain manually checked imagery only for the same event and venue. New
# discoveries receive the shared category illustration until editorial review.
previous = json.loads(Path("events.json").read_text(encoding="utf-8")) if Path("events.json").exists() else {}
images = {(e.get("title"), e.get("venue")): e for e in previous.get("events", [])}
for event in valid:
    reviewed = images.get((event["title"], event["venue"]), {})
    for field in ("imageUrl", "imageAlt", "imageKind", "imageCaption", "imageCredit", "imageSourceUrl", "imageVerifiedAt"):
        if field in reviewed:
            event[field] = reviewed[field]
    event.setdefault("imageKind", "category")
valid.sort(key=lambda x:x["date"])
edition={"issue":"CULTURE SCOUT / "+today.strftime("%d %B %Y").upper(),"range":f"THREE WEEKS · {today.strftime('%d %b').upper()} – {end.strftime('%d %b %Y').upper()}","notice":"Research-generated weekly listings; check organiser pages for prices, ages and ticket availability before booking. Updated "+today.isoformat()+".","events":valid[:20]}
Path("events.json").write_text(json.dumps(edition,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Wrote",len(edition["events"]),"events for",today)
