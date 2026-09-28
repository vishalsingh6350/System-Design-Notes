"""Build ../index.html from template.html, guide.css, app.js and the topic fragments.

guide/topic_NN.html     -> "Rapid Guide" view (top-down, 4-phase)
original/topic_NN.html  -> "Original" view (the author's notes as HTML)
"""
import html
import os
import re
import sys
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TOPICS = [
    (1, "Scaling"), (2, "Back-of-Envelope Estimation"), (3, "System Design Framework"),
    (4, "Rate Limiter"), (5, "Consistent Hashing"), (6, "Key-Value Store"),
    (7, "Unique-Id Generator"), (8, "URL Shortener"), (9, "Web Crawler"),
    (10, "Notification System"), (11, "News Feed System"), (12, "Chat System"),
    (13, "Search Autocomplete"), (14, "YouTube"), (15, "Google Drive"),
    (16, "Proximity Service"), (17, "Nearby Friends"), (18, "Google Maps"),
    (19, "Distributed Message Queue"), (20, "Metrics Monitoring & Alerting"),
    (21, "Ad Click Event Aggregation"), (22, "Hotel Reservation System"),
    (23, "Distributed Email Service"), (24, "S3-like Object Storage"),
    (25, "Real-time Gaming Leaderboard"), (26, "Payment System"),
    (27, "Digital Wallet"), (28, "Stock Exchange"),
]


def read(*parts):
    with open(os.path.join(HERE, *parts), encoding="utf-8") as f:
        return f.read()


def strip_tags(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t))).strip()


def check(nn, name, frag, problems):
    for src in re.findall(r'<img[^>]+src="([^"]+)"', frag):
        if not os.path.exists(os.path.join(ROOT, unquote(src))):
            problems.append(f"topic {nn} {name}: missing image {src}")
    for tag in ("div", "details", "figure", "table", "ul", "ol"):
        opened = len(re.findall(rf"<{tag}[\s>]", frag))
        closed = frag.count(f"</{tag}>")
        if opened != closed:
            problems.append(f"topic {nn} {name}: <{tag}> {opened} opened vs {closed} closed")
    if name == "guide" and re.search(r'\sstyle="', frag):
        problems.append(f"topic {nn} guide: inline style attribute")


def load_anims(problems):
    anim_dir = os.path.join(HERE, "anims")
    files = sorted(f for f in os.listdir(anim_dir) if f.endswith(".js")) if os.path.isdir(anim_dir) else []
    scenes = {}
    for f in files:
        src = read("anims", f)
        ids = re.findall(r"id:\s*'([^']+)'", src)
        if not ids:
            problems.append(f"anims/{f}: no SDAnim.register id found")
        for i in ids:
            scenes[i] = f
    bundle = read("anim.js") + "\n" + "\n".join(read("anims", f) for f in files) + "\nSDAnim.mountAll();\n"
    return scenes, bundle


def main():
    template = read("template.html")
    cards, sections, problems = [], [], []
    scenes, anim_bundle = load_anims(problems)
    used = set()

    for num, title in TOPICS:
        nn = f"{num:02d}"
        gen = read("guide", f"topic_{nn}.html").strip()
        orig = read("original", f"topic_{nn}.html").strip()
        check(nn, "guide", gen, problems)
        check(nn, "original", orig, problems)

        anims = re.findall(r'data-anim="([^"]+)"', gen)
        for a in anims:
            used.add(a)
            if a not in scenes:
                problems.append(f"topic {nn}: placeholder data-anim=\"{a}\" has no scene in anims/")
        badge = f'\n      <span class="tc-badge">▶ {len(anims)} animation{"s" if len(anims) > 1 else ""}</span>' if anims else ""

        anchor = f"topic-{nn}"
        m = re.search(r'<p class="purpose-statement">(.*?)</p>', gen, re.S)
        blurb = strip_tags(m.group(1)) if m else ""
        search = html.escape((title + " " + blurb + (" animation" if anims else "")).lower())
        cards.append(
            f'<button type="button" class="topic-card" data-target="{anchor}" data-search="{search}">\n'
            f'      <div class="tc-top"><span class="tc-num">{nn}</span><h3 class="tc-title">{html.escape(title)}</h3></div>\n'
            f'      <p class="tc-blurb">{html.escape(blurb)}</p>{badge}\n'
            f'      <div class="tc-status"></div>\n'
            f'    </button>'
        )
        sections.append(
            f'    <section class="topic-section" id="{anchor}" hidden>\n'
            f'      <div class="topic-head"><span class="topic-num">{nn}</span><h2 class="topic-title">{html.escape(title)}</h2></div>\n'
            f'      <div class="content generated">\n{gen}\n      </div>\n'
            f'      <div class="content original">\n{orig}\n      </div>\n'
            f'    </section>'
        )

    out = (template
           .replace("/*__CSS__*/", read("guide.css"))
           .replace("/*__JS__*/", anim_bundle + "\n" + read("app.js"))
           .replace("__INDEX_CARDS__", "\n    ".join(cards))
           .replace("__TOPIC_SECTIONS__", "\n".join(sections)))

    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(out)

    words = sum(len(strip_tags(read("guide", f"topic_{n:02d}.html")).split()) for n, _ in TOPICS)
    for s in sorted(set(scenes) - used):
        problems.append(f"scene '{s}' ({scenes[s]}) is not placed in any guide")
    print(f"index.html written: {len(sections)} topics, ~{words:,} words of Rapid Guide, "
          f"{len(used)} animations, {len(out)//1024} KB")
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print("  -", p)
        sys.exit(1)


if __name__ == "__main__":
    main()
