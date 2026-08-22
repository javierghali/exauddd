import json, re, sys
from datetime import datetime, timezone
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'/'recent-values.json'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'

def fetch(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'})
    with urllib.request.urlopen(req,timeout=25) as r:
        return r.read().decode('utf-8','ignore')

def clean_text(html):
    html=re.sub(r'<script[\s\S]*?</script>',' ',html,flags=re.I)
    html=re.sub(r'<style[\s\S]*?</style>',' ',html,flags=re.I)
    text=re.sub(r'<[^>]+>',' ',html)
    return re.sub(r'\s+',' ',text).strip()

def parse_starpets(html):
    text=clean_text(html)
    pats=[r'Best price\s*\$?\s*([0-9]+(?:\.[0-9]+)?)',r'Harga terbaik\s*\$?\s*([0-9]+(?:\.[0-9]+)?)']
    for p in pats:
        m=re.search(p,text,re.I)
        if m:return float(m.group(1))
    raise ValueError('best price not found')

def parse_amvgg(html):
    text=clean_text(html)
    m=re.search(r'\bValue\s*([0-9]+(?:\.[0-9]+)?)\b',text,re.I)
    if not m: raise ValueError('value not found')
    return float(m.group(1))

def update_source(src, parser):
    url=src.get('url')
    if not url:return
    try:
        value=parser(fetch(url))
        src['value']=value
        src['status']='ok'
        src['checked_at']=datetime.now(timezone.utc).isoformat()
        src.pop('error',None)
    except Exception as e:
        src['status']='stale'
        src['checked_at']=datetime.now(timezone.utc).isoformat()
        src['error']=str(e)[:160]

obj=json.loads(DATA.read_text('utf-8'))
for week in obj.get('weeks',[]):
    for item in week.get('items',[]):
        update_source(item.get('starpets',{}),parse_starpets)
        update_source(item.get('amvgg',{}),parse_amvgg)
obj['updated_at']=datetime.now(timezone.utc).isoformat()
DATA.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n','utf-8')
print('updated',DATA)
