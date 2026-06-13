import json
import os
import hashlib
import time
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="时光胶囊 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")


def read_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class MemberCreate(BaseModel):
    name: str
    birth_year: Optional[str] = None
    death_year: Optional[str] = None
    avatar: Optional[str] = None
    parent_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    birth_year: Optional[str] = None
    death_year: Optional[str] = None
    avatar: Optional[str] = None
    parent_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class StoryCreate(BaseModel):
    member_id: str
    title: Optional[str] = None
    text: Optional[str] = None
    photo: Optional[str] = None
    voice: Optional[str] = None
    year: Optional[str] = None


class ShareCreate(BaseModel):
    title: str
    member_ids: list[str]
    story_ids: list[str]


def generate_short_id(data: str) -> str:
    raw = f"{data}{time.time()}{os.urandom(4).hex()}"
    return hashlib.md5(raw.encode()).hexdigest()[:8]


@app.get("/api/tree")
def get_tree():
    data = read_data()
    return {"members": data["members"]}


@app.post("/api/tree")
def add_member(member: MemberCreate):
    data = read_data()
    mid = generate_short_id(member.name)
    new_member = {
        "id": mid,
        "name": member.name,
        "birth_year": member.birth_year,
        "death_year": member.death_year,
        "avatar": member.avatar,
        "parent_id": member.parent_id,
        "x": member.x or 0,
        "y": member.y or 0,
    }
    data["members"].append(new_member)
    write_data(data)
    return new_member


@app.put("/api/tree/{member_id}")
def update_member(member_id: str, member: MemberUpdate):
    data = read_data()
    for m in data["members"]:
        if m["id"] == member_id:
            if member.name is not None:
                m["name"] = member.name
            if member.birth_year is not None:
                m["birth_year"] = member.birth_year
            if member.death_year is not None:
                m["death_year"] = member.death_year
            if member.avatar is not None:
                m["avatar"] = member.avatar
            if member.parent_id is not None:
                m["parent_id"] = member.parent_id
            if member.x is not None:
                m["x"] = member.x
            if member.y is not None:
                m["y"] = member.y
            write_data(data)
            return m
    return {"error": "Member not found"}


@app.delete("/api/tree/{member_id}")
def delete_member(member_id: str):
    data = read_data()
    data["members"] = [m for m in data["members"] if m["id"] != member_id]
    data["stories"] = [s for s in data["stories"] if s["member_id"] != member_id]
    for m in data["members"]:
        if m.get("parent_id") == member_id:
            m["parent_id"] = None
    write_data(data)
    return {"ok": True}


@app.get("/api/stories")
def get_stories(member_id: Optional[str] = Query(None)):
    data = read_data()
    stories = data["stories"]
    if member_id:
        stories = [s for s in stories if s["member_id"] == member_id]
    return {"stories": stories}


@app.post("/api/stories")
def add_story(story: StoryCreate):
    data = read_data()
    sid = generate_short_id(story.member_id + (story.title or ""))
    new_story = {
        "id": sid,
        "member_id": story.member_id,
        "title": story.title,
        "text": story.text,
        "photo": story.photo,
        "voice": story.voice,
        "year": story.year,
    }
    data["stories"].append(new_story)
    write_data(data)
    return new_story


@app.delete("/api/stories/{story_id}")
def delete_story(story_id: str):
    data = read_data()
    data["stories"] = [s for s in data["stories"] if s["id"] != story_id]
    write_data(data)
    return {"ok": True}


@app.post("/api/share")
def create_share(share: ShareCreate):
    data = read_data()
    short_id = generate_short_id(share.title + str(share.member_ids))

    selected_members = [m for m in data["members"] if m["id"] in share.member_ids]
    selected_stories = [s for s in data["stories"] if s["id"] in share.story_ids]

    combined = []
    for m in selected_members:
        member_stories = [s for s in selected_stories if s["member_id"] == m["id"]]
        combined.append({"member": m, "stories": member_stories})

    combined.sort(key=lambda x: x["member"].get("birth_year", "0"))

    html_content = generate_memoir_html(share.title, combined)

    share_record = {
        "id": short_id,
        "title": share.title,
        "member_ids": share.member_ids,
        "story_ids": share.story_ids,
        "html": html_content,
        "created_at": time.time(),
    }
    data["shares"][short_id] = share_record
    write_data(data)

    return {
        "share_id": short_id,
        "share_url": f"/share/{short_id}",
        "title": share.title,
    }


@app.get("/api/share/{share_id}")
def get_share(share_id: str):
    data = read_data()
    share = data["shares"].get(share_id)
    if not share:
        return {"error": "Share not found"}
    return share


def generate_memoir_html(title: str, combined: list) -> str:
    pages_html = ""
    for idx, item in enumerate(combined):
        m = item["member"]
        stories_html = ""
        for s in item["stories"]:
            photo_tag = ""
            if s.get("photo"):
                photo_tag = f'<img src="{s["photo"]}" style="width:100%;max-height:300px;object-fit:cover;border:2px solid #D4A574;border-radius:8px;margin:12px 0;" />'
            voice_tag = ""
            if s.get("voice"):
                voice_tag = f'<div style="background:#F5E6D3;padding:8px 12px;border-radius:8px;margin:8px 0;font-size:14px;color:#4A3B32;">🎙️ 语音故事</div>'
            stories_html += f"""
            <div class="story-item" style="animation-delay:{idx * 0.2}s">
                <h4 style="color:#D4A574;margin:8px 0 4px;">{s.get('title', '未命名故事')}</h4>
                {photo_tag}
                {voice_tag}
                <p style="color:#4A3B32;line-height:1.8;">{s.get('text', '')}</p>
            </div>"""

        birth = m.get("birth_year", "?")
        death = m.get("death_year", "")
        years = f"{birth} - {death}" if death else f"{birth} - 至今"

        pages_html += f"""
        <div class="memoir-page" data-page="{idx}">
            <div class="page-content">
                <div class="member-header">
                    <div class="avatar-circle" style="background:#D4A574;width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;color:#FFF5E6;margin:0 auto 12px;">
                        {m.get("name", "?")[0]}
                    </div>
                    <h2 style="color:#4A3B32;margin:0;">{m.get("name", "未知")}</h2>
                    <p style="color:#8B7355;margin:4px 0;">{years}</p>
                </div>
                <div class="stories-list">
                    {stories_html}
                </div>
            </div>
        </div>"""

    total_pages = len(combined)
    return f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} - 时光胶囊</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#FFF5E6;color:#4A3B32;font-family:'Noto Serif SC',serif;min-height:100vh}}
.memoir-container{{max-width:800px;margin:0 auto;padding:24px}}
.memoir-title{{text-align:center;font-size:28px;color:#4A3B32;padding:24px 0;border-bottom:2px solid #D4A574;margin-bottom:24px}}
.memoir-page{{background:white;border-radius:16px;padding:32px;margin-bottom:24px;box-shadow:0 4px 20px rgba(74,59,50,0.08);animation:fadeInPage 0.6s ease both}}
.member-header{{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px dashed #D4A574}}
.story-item{{padding:12px 0;border-bottom:1px solid #F5E6D3;animation:fadeInStory 0.5s ease both}}
.story-item:last-child{{border-bottom:none}}
@keyframes fadeInPage{{from{{opacity:0;transform:translateX(40px)}}to{{opacity:1;transform:translateX(0)}}}}
@keyframes fadeInStory{{from{{opacity:0;transform:translateY(10px)}}to{{opacity:1;transform:translateY(0)}}}}
.progress-bar{{position:fixed;bottom:0;left:0;height:3px;background:#D4A574;transition:width 0.3s}}
.page-indicator{{position:fixed;bottom:12px;right:24px;font-size:14px;color:#8B7355}}
</style>
</head>
<body>
<div class="memoir-container">
<h1 class="memoir-title">{title}</h1>
{pages_html}
</div>
<div class="progress-bar" style="width:0%"></div>
<div class="page-indicator">1 / {total_pages}</div>
<script>
const pages=document.querySelectorAll('.memoir-page');
const bar=document.querySelector('.progress-bar');
const indicator=document.querySelector('.page-indicator');
window.addEventListener('scroll',()=>{{
const h=document.documentElement.scrollHeight-window.innerHeight;
const p=h>0?window.scrollY/h:0;
bar.style.width=(p*100)+'%';
const vis=Math.floor(p*pages.length)+1;
indicator.textContent=Math.min(vis,{total_pages})+' / {total_pages}';
}});
const obs=new IntersectionObserver((entries)=>{{
entries.forEach(e=>{{if(e.isIntersecting)e.target.style.animationPlayState='running'}});
}},{{threshold:0.1}});
pages.forEach(p=>obs.observe(p));
</script>
</body>
</html>"""
