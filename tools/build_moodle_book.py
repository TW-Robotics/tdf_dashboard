"""Build a Moodle Book import zip from the Markdown setup guides.

Usage (from the project folder):
    pip install -r tools/requirements.txt
    python tools/build_moodle_book.py

Output: dist/tdf_book_import.zip
In Moodle: Book -> More -> Import chapter -> "Each HTML file represents one chapter".

Robots, their order and images come from frontend/js/robots.js (LAB_ROBOTS, LAB_ART);
each guide is frontend/docs/<docFile>. Edit those, run this script, import the new zip
into a fresh Book (importing again into the same Book adds a second set of chapters).
"""
import html, re, shutil, sys, tempfile, zipfile
from pathlib import Path

import markdown
from bs4 import BeautifulSoup, NavigableString
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend"
DIST = ROOT / "dist"


def read_robots_js(path):
    """Read LAB_ROBOTS and LAB_ART from robots.js without needing Node.js."""
    js = path.read_text(encoding="utf-8")
    pair = re.compile(r'(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?)')
    def value(v):
        return v[1:-1].replace('\\"', '"') if v.startswith('"') else float(v) if "." in v else int(v)
    robots_block = js[js.index("LAB_ROBOTS"):js.index("];", js.index("LAB_ROBOTS"))]
    robots = []
    for line in robots_block.splitlines():
        line = line.strip()
        if line.startswith("{") and not line.startswith("//"):
            robots.append({k: value(v) for k, v in pair.findall(line)})
    art_block = js[js.index("LAB_ART"):js.index("};", js.index("LAB_ART"))]
    art = {}
    for line in art_block.splitlines():
        line = line.split("//")[0]
        m = re.search(r'(\w+)\s*:\s*"([^"]+)"', line)
        if m:
            art[m.group(1)] = m.group(2)
    return robots, art


robots, art = read_robots_js(SRC / "js" / "robots.js")
if not robots:
    sys.exit("No robots found in frontend/js/robots.js")
ids = [r.get("id") for r in robots]
dupes = sorted({i for i in ids if ids.count(i) > 1})
if dupes:
    sys.exit(f"Duplicate robot ids in robots.js: {dupes}")

OUT = Path(tempfile.mkdtemp(prefix="moodle_book_"))
stage = OUT / "book"
(stage / "images").mkdir(parents=True, exist_ok=True)

fname = {r["id"]: f"{i+1:02d}_{r['id']}.html" for i, r in enumerate(robots)}

# Inline styles as a fallback; Bootstrap classes (Boost theme) do most of the work.
BOX = "padding:.75rem 1rem;border-radius:6px;margin:1rem 0;border-left:4px solid {c};background:{b}"
ADM = {
    "note":    ("alert alert-info",    BOX.format(c="#1d5aa6", b="#eef4fb"), "Note"),
    "warning": ("alert alert-warning", BOX.format(c="#c0322b", b="#fdf0ef"), "Warning"),
    "tip":     ("alert alert-success", BOX.format(c="#2e7d32", b="#eef7ef"), "Tip"),
}
PRE = ("background:#f4f6f8;border:1px solid #d9dee5;border-radius:6px;padding:.75rem 1rem;"
       "overflow:auto;font-size:.875rem;line-height:1.45;white-space:pre")
URL_RE = re.compile(r"https?://[^\s<>()\"']+[^\s<>()\"'.,;:!?]")


def page(title, body):
    return (f'<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>{html.escape(title)}</title></head>\n'
            f'<body>\n{body}\n</body></html>\n')


def adm(soup, kind, children):
    cls, style, label = ADM[kind]
    d = soup.new_tag("div", attrs={"class": cls, "style": style})
    t = soup.new_tag("p", attrs={"style": "margin:0 0 .25rem;font-weight:bold"})
    t.string = label
    d.append(t)
    for c in children:
        d.append(c)
    return d


def convert(md_text, robot):
    md_text = re.sub(r"^(\s*[-*]) \[ \] ", r"\1 ☐ ", md_text, flags=re.M)
    md_text = re.sub(r"^(\s*[-*]) \[[xX]\] ", r"\1 ☑ ", md_text, flags=re.M)
    raw = markdown.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    soup = BeautifulSoup(raw, "html.parser")

    h1 = soup.find("h1")
    if h1:
        h1.decompose()           # the Book shows the chapter title itself
    for hr in soup.find_all("hr"):
        hr.decompose()

    # "## !!! text" headings -> tip box
    for h in soup.find_all(["h2", "h3", "h4"]):
        if re.match(r"^\s*!{2,}", h.get_text()):
            p = soup.new_tag("p", attrs={"style": "margin:0"})
            p.string = re.sub(r"^\s*!+\s*", "", h.get_text())
            h.replace_with(adm(soup, "tip", [p]))

    # blockquotes -> note / warning boxes
    for q in soup.find_all("blockquote"):
        txt = q.get_text().strip()
        strong = q.select_one("p > strong")
        kind = "note"
        if strong and strong.parent.contents[0] is strong and \
                re.match(r"^(note|warning|caution|tip|danger):?$", strong.get_text().strip(), re.I):
            word = strong.get_text().strip().rstrip(":").lower()
            kind = "warning" if word in ("warning", "caution", "danger") else ("tip" if word == "tip" else "note")
            nxt = strong.next_sibling
            strong.decompose()
            if isinstance(nxt, NavigableString):
                nxt.replace_with(re.sub(r"^\s*:?\s*", "", str(nxt)))
        elif re.match(r"^(warning|caution|danger)\b", txt, re.I):
            kind = "warning"
        q.replace_with(adm(soup, kind, list(q.children)))

    # code blocks
    for code in soup.select("pre > code"):
        pre = code.parent
        m = re.search(r"language-([\w-]+)", " ".join(code.get("class", [])))
        lang = m.group(1).lower() if m else ""
        pre["style"] = PRE
        code.attrs = {}
        if lang:
            lab = soup.new_tag("div", attrs={"style": "font-size:.75rem;color:#5b6472;margin:1rem 0 -.6rem;"
                                             "text-transform:uppercase;letter-spacing:.05em"})
            lab.string = lang
            pre.insert_before(lab)
    for code in soup.find_all("code"):
        if code.parent.name != "pre":
            code["style"] = "background:#f1f3f6;padding:.1em .3em;border-radius:3px"

    # tables
    for t in soup.find_all("table"):
        t["class"] = "table table-bordered table-sm"
        t["style"] = "border-collapse:collapse;width:auto;max-width:100%"
        for c in t.find_all(["td", "th"]):
            c["style"] = "border:1px solid #d9dee5;padding:.35rem .6rem;vertical-align:top"
        wrap = soup.new_tag("div", attrs={"style": "overflow-x:auto"})
        t.wrap(wrap)
        thead = t.find("thead")    # header row of "| | |" tables is empty -> drop it
        if thead and not thead.get_text(strip=True):
            thead.decompose()

    # "*Expected …*" lines
    for em in soup.select("p > em"):
        p = em.parent
        if len(p.contents) == 1 and re.match(r"^expected", em.get_text(), re.I):
            p["style"] = "border-left:3px solid #2e7d32;padding-left:.75rem;color:#2e5e31"

    # links between guides: "#doc-<id>" or "<id>.md" -> chapter file (Moodle relinks these on import)
    for a in soup.find_all("a", href=True):
        h = a["href"]
        m = re.match(r"^#doc-([\w-]+)$", h) or re.match(r"^(?:docs/)?([\w-]+)\.md$", h)
        if m:
            rid = m.group(1)
            if rid not in fname:   # md filename may differ from id
                rid = next((r["id"] for r in robots if Path(r.get("docFile", "")).stem == rid), None)
            if rid:
                a["href"] = fname[rid]
        elif h.startswith("http"):
            a["target"] = "_blank"

    # bare URLs -> links
    for s in list(soup.find_all(string=URL_RE)):
        if s.find_parent(["a", "pre", "code"]):
            continue
        parts, last, txt = [], 0, str(s)
        for m in URL_RE.finditer(txt):
            parts.append(NavigableString(txt[last:m.start()]))
            a = soup.new_tag("a", href=m.group(0), target="_blank")
            a.string = m.group(0)
            parts.append(a)
            last = m.end()
        parts.append(NavigableString(txt[last:]))
        for p in parts:
            s.insert_before(p)
        s.extract()

    return str(soup)


def robot_header(r, img, with_table):
    rows = [("Maker", r["maker"]), ("Type", r["type"]), ("Location", r["cell"]),
            ("Controller", r["ctrl"]), ("IP address", r["ip"]), ("SDK", r["sdk"])]
    tr = "".join(f'<tr><th style="text-align:left;padding:.2rem .8rem .2rem 0;white-space:nowrap">{k}</th>'
                 f'<td style="padding:.2rem 0">{html.escape(str(v))}</td></tr>' for k, v in rows)
    pic = (f'<img src="images/{img}" alt="{html.escape(r["name"])}" '
           f'style="max-width:220px;max-height:180px;width:auto;height:auto;float:right;margin:0 0 1rem 1.5rem">'
           if img else "")
    table = f'<table style="font-size:.9rem;border-collapse:collapse">{tr}</table>' if with_table else ""
    return (f'<div style="overflow:hidden;margin-bottom:1rem">{pic}{table}'
            f'<p style="margin-top:.75rem"><em>Availability: see the <strong>Robot availability</strong> '
            f'database in this course.</em></p></div>')


# images: shrink to max 600 px, keep PNG transparency
used = {}
for r in robots:
    src = art.get(r["art"])
    if not src:
        continue
    name = Path(src).name
    if name not in used:
        if not (SRC / src).exists():
            print("WARNING – image not found:", src)
            continue
        im = Image.open(SRC / src)
        im.thumbnail((600, 600))
        im.save(stage / "images" / name, optimize=True)
        used[name] = True

# chapters
missing = []
for r in robots:
    doc = SRC / (r.get("docFile") or f"docs/{r['id']}.md")
    if not doc.exists():
        missing.append(str(doc))
        continue
    img = Path(art[r["art"]]).name if Path(art.get(r["art"], "-")).name in used else None
    text = doc.read_text(encoding="utf-8")
    body = robot_header(r, img, "**IP address**" not in text) + convert(text, r)
    (stage / fname[r["id"]]).write_text(page(r["name"], body), encoding="utf-8")

# overview chapter: clickable tiles (title on top, robot image underneath)
def tile(r):
    img = Path(art[r["art"]]).name if Path(art.get(r["art"], "-")).name in used else None
    pic = (f'<img src="images/{img}" alt="{html.escape(r["name"])}" '
           f'style="max-width:100%;max-height:150px;width:auto;height:auto;display:block;margin:0 auto">' if img else "")
    return (
        '<div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-3" style="display:inline-block;vertical-align:top;'
        'width:240px;max-width:100%;padding:0 8px;margin-bottom:16px">'
        f'<a href="{fname[r["id"]]}" class="card h-100 text-decoration-none" '
        'style="display:block;height:100%;border:1px solid #d9dee5;border-radius:8px;background:#fff;'
        'color:inherit;text-decoration:none;overflow:hidden">'
        '<div class="card-body" style="padding:12px 14px;height:104px;overflow:hidden">'
        f'<div style="font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:#5b6472">{html.escape(r["maker"])}</div>'
        f'<div style="font-weight:600;font-size:1rem;line-height:1.3;margin:2px 0 4px;color:#1b1f24">{html.escape(r["name"])}</div>'
        f'<div style="font-size:.78rem;color:#5b6472">{html.escape(r["cell"])} · {html.escape(r["ip"])}</div></div>'
        f'<div style="background:#eef1f5;padding:12px;height:174px;display:flex;align-items:center;justify-content:center">{pic}</div>'
        '<div style="padding:8px 14px;font-size:.85rem;color:#1d5aa6;font-weight:600">Setup guide &rarr;</div>'
        '</a></div>')

overview = (
    '<p>Setup guides for every robot in the Digital Factory Lab at FH Technikum Wien. Click a robot to open its guide.</p>'
    f'<div class="{ADM["note"][0]}" style="{ADM["note"][1]}"><p style="margin:0">To see whether a robot is free, '
    'open the <strong>Robot availability</strong> database in this course. Bookings are managed by the lab admin.</p></div>'
    '<div class="row" style="margin:0 -8px">' + "".join(tile(r) for r in robots) + '</div>'
    f'<div class="{ADM["warning"][0]}" style="{ADM["warning"][1]}"><p style="margin:0">Most guides describe typical '
    'setups with example IP addresses, frames and credentials. Check every value against the lab\'s real equipment '
    'before use.</p></div>'
    '<p style="color:#5b6472;font-size:.85rem">© Dr. Kannan Peesapati</p>')
(stage / "00_overview.html").write_text(page("Overview", overview), encoding="utf-8")

DIST.mkdir(exist_ok=True)
zpath = DIST / "tdf_book_import.zip"
with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(stage.rglob("*")):
        if f.is_file():
            z.write(f, f.relative_to(stage).as_posix())
n = len(list(stage.glob("*.html")))
shutil.rmtree(OUT, ignore_errors=True)
print(f"Built {zpath.relative_to(ROOT)}: {n} chapters, {len(used)} images, {zpath.stat().st_size // 1024} KB")
if missing:
    print("WARNING – guides not found (skipped):", *missing, sep="\n  ")
