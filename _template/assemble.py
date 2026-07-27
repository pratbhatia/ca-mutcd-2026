"""
Post-processing / assembly script for the CA MUTCD training site.

Run from repo root (C:\\Users\\PratyushBhatia\\ca-mutcd-2026) once content
agents have written their chapter HTML files + manifests:

    python training/_template/assemble.py

What it does:
1. Loads every training/_manifest/part{N}_{letter}.json
2. For each Part, builds the shared sidebar <nav> HTML (full chapter list +
   the current chapter's own section links) and injects it into every
   chapter HTML file at the `<!-- SIDEBAR_NAV -->` marker.
3. Injects prev/next pager links at the `<!-- PAGER -->` marker (chapter
   order = manifest order within a part; first/last chapter links to the
   adjacent Part's index/first chapter).
4. Builds training/part{N}/index.html from the part's manifests.
5. Builds training/assets/js/search-index.js from all manifests (chapter
   titles + every section code/title, chapter file path).
6. Reports any missing chapters (expected vs. found) so gaps are obvious.
"""
import json, os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # training/
SITE = ROOT
MANIFEST_DIR = os.path.join(SITE, "_manifest")
REPO_ROOT = os.path.dirname(SITE)

PART_TITLES = {
    1: "General",
    2: "Signs",
    3: "Markings",
    4: "Highway Traffic Signals",
    5: "Traffic Control Device Considerations for Automated Vehicles",
    6: "Temporary Traffic Control",
    7: "Traffic Control for School Areas",
    8: "Traffic Control for Railroad and Light Rail Transit Grade Crossings",
    9: "Traffic Control for Bicycle Facilities",
}

EXPECTED = json.load(open(os.path.join(REPO_ROOT, "training", "_chapter_files.json"), encoding="utf-8"))


def load_manifests():
    parts = {}
    files = sorted(glob.glob(os.path.join(MANIFEST_DIR, "part*_*.json")))
    for f in files:
        data = json.load(open(f, encoding="utf-8"))
        parts.setdefault(data["part_num"], []).append(data)
    for p in parts:
        parts[p].sort(key=lambda c: c["chapter_letter"])
    return parts


def report_missing(parts):
    print("=== Coverage check ===")
    for p in sorted(set(c["part"] for c in EXPECTED)):
        expected_letters = sorted(c["letter"] for c in EXPECTED if c["part"] == p)
        found_letters = sorted(m["chapter_letter"] for m in parts.get(p, []))
        missing = [l for l in expected_letters if l not in found_letters]
        status = "OK" if not missing else f"MISSING: {missing}"
        print(f"Part {p}: expected {len(expected_letters)}, found {len(found_letters)} -- {status}")


def build_sidebar(part_num, chapters, current_letter):
    html = []
    for ch in chapters:
        is_current = ch["chapter_letter"] == current_letter
        active = " active" if is_current else ""
        html.append(
            f'<div class="chapter-group">\n'
            f'  <a class="chapter-link{active}" href="{ch["file"]}" data-chapter-id="{part_num}{ch["chapter_letter"]}">'
            f'<span class="num">{ch["chapter_code"]}</span> {ch["short_title"]}<span class="done-dot"></span></a>'
        )
        if is_current:
            for sec in ch.get("sections", []):
                html.append(f'  <a class="section-link" href="#{sec["id"]}">{sec["code"]} {sec["title"]}</a>')
        html.append("</div>")
    return "\n".join(html)


def inject(path, marker_name, replacement):
    if not os.path.exists(path):
        print(f"  !! missing file: {path}")
        return False
    text = open(path, encoding="utf-8").read()
    # Agents copied the template's full multi-line marker comment verbatim
    # (e.g. "<!-- SIDEBAR_NAV: leave this exact HTML comment marker ... -->"),
    # not a bare "<!-- SIDEBAR_NAV -->", so match the whole HTML comment that
    # starts with the marker name.
    pattern = re.compile(r"<!--\s*" + re.escape(marker_name) + r".*?-->", re.S)
    if not pattern.search(text):
        print(f"  !! marker {marker_name} not found in {path}")
        return False
    text = pattern.sub(lambda m: replacement, text, count=1)
    open(path, "w", encoding="utf-8").write(text)
    return True


def process_part(part_num, chapters):
    part_dir = os.path.join(SITE, f"part{part_num}")
    for i, ch in enumerate(chapters):
        chapter_path = os.path.join(part_dir, ch["file"])
        sidebar_html = build_sidebar(part_num, chapters, ch["chapter_letter"])
        inject(chapter_path, "SIDEBAR_NAV", sidebar_html)

        prev_href, prev_label = (f"index.html", f"Part {part_num} overview")
        if i > 0:
            prev = chapters[i - 1]
            prev_href, prev_label = prev["file"], f'Ch. {prev["chapter_code"]} — {prev["short_title"]}'
        if i < len(chapters) - 1:
            nxt = chapters[i + 1]
            next_href, next_label = nxt["file"], f'Ch. {nxt["chapter_code"]} — {nxt["short_title"]}'
        else:
            next_href, next_label = "index.html", f"Part {part_num} overview"

        pager_html = (
            '<div class="pager">'
            f'<a class="prev" href="{prev_href}"><span class="dir">← Previous</span><span class="lbl">{prev_label}</span></a>'
            f'<a class="next" href="{next_href}"><span class="dir">Next →</span><span class="lbl">{next_label}</span></a>'
            "</div>"
        )
        inject(chapter_path, "PAGER", pager_html)
    print(f"Part {part_num}: injected sidebar/pager into {len(chapters)} chapters")


def build_part_index(part_num, chapters):
    title = PART_TITLES[part_num]
    total_pages = sum(c.get("source_pages", 0) for c in chapters)
    cards = []
    for ch in chapters:
        cards.append(f'''
        <div class="chapter-card">
          <span class="check" data-chapter-id="{part_num}{ch["chapter_letter"]}"></span>
          <div class="chapter-code">Chapter {ch["chapter_code"]}</div>
          <h3><a href="{ch["file"]}">{ch["title"]}</a></h3>
          <p>{ch.get("description","")}</p>
          <div class="meta">{len(ch.get("sections", []))} sections</div>
        </div>''')
    sidebar = build_sidebar(part_num, chapters, current_letter=None)

    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Part {part_num} — {title} | CA MUTCD 2026 Training</title>
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body data-root="../">
<header class="site-header">
  <div class="bar">
    <button class="icon-btn sidebar-toggle" data-action="toggle-sidebar" aria-label="Toggle chapter navigation">☰</button>
    <a class="brand" href="../index.html">
      <span class="badge">CA</span>
      <span>CA MUTCD 2026<small>Interactive Training</small></span>
    </a>
    <nav class="breadcrumb">
      <a href="../index.html">Home</a><span class="sep">/</span>
      <span class="current">Part {part_num} — {title}</span>
    </nav>
    <div class="header-actions">
      <button class="search-trigger" data-action="open-search"><span>Search manual…</span><kbd>Ctrl K</kbd></button>
      <button class="icon-btn" data-action="toggle-theme" aria-label="Toggle dark mode">◐</button>
    </div>
  </div>
</header>

<div class="layout">
  <aside class="sidebar">
    <a class="sidebar-back" href="../index.html">← All 9 Parts</a>
    <div class="part-label">Part {part_num}</div>
    <div class="part-title">{title}</div>
    <nav>
{sidebar}
    </nav>
  </aside>

  <main class="main">
    <div class="content">
      <p class="eyebrow">Part {part_num} of 9</p>
      <h1 class="page-title">{title}</h1>
      <p class="page-subtitle">{len(chapters)} chapters · {total_pages} source pages</p>

      <div class="chapter-grid">{''.join(cards)}
      </div>
    </div>
  </main>
</div>

<footer class="site-footer"><div class="container">California MUTCD 2026 Edition — Interactive Training Reference. Not a substitute for the official California MUTCD; verify against the source document for legal/design purposes.</div></footer>

<script src="../assets/js/search-index.js"></script>
<script src="../assets/js/app.js"></script>
</body>
</html>
'''
    path = os.path.join(SITE, f"part{part_num}", "index.html")
    open(path, "w", encoding="utf-8").write(html)
    print(f"Part {part_num}: wrote index.html")


def build_search_index(parts):
    entries = []
    for part_num, chapters in parts.items():
        title = PART_TITLES[part_num]
        for ch in chapters:
            url = f"part{part_num}/{ch['file']}"
            entries.append({"t": f'{ch["chapter_code"]} {ch["title"]}', "k": f"Part {part_num} — {title}", "u": url})
            for sec in ch.get("sections", []):
                entries.append({
                    "t": f'{sec["code"]} {sec["title"]}',
                    "k": f'Part {part_num} › Ch. {ch["chapter_code"]} {ch["short_title"]}',
                    "u": f"{url}#{sec['id']}",
                })
    js = "window.MUTCD_SEARCH_INDEX = " + json.dumps(entries, ensure_ascii=False) + ";\n"
    path = os.path.join(SITE, "assets", "js", "search-index.js")
    open(path, "w", encoding="utf-8").write(js)
    print(f"Search index: {len(entries)} entries")


def main():
    parts = load_manifests()
    report_missing(parts)
    for part_num, chapters in sorted(parts.items()):
        process_part(part_num, chapters)
        build_part_index(part_num, chapters)
    build_search_index(parts)
    print("Done.")


if __name__ == "__main__":
    main()
