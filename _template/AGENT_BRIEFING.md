# CA MUTCD 2026 Training Site — Content Agent Briefing

You are building part of a professional, in-depth, web-based training reference
for the **California MUTCD (Manual on Uniform Traffic Control Devices) 2026
Edition**, for practicing traffic engineers/planners as a refresher and
day-to-day reference. Read this entire briefing before writing anything.

**Repo root:** `C:\Users\PratyushBhatia\ca-mutcd-2026`
Source PDFs live directly in that folder (e.g. `2b.pdf`). The training site
lives in `C:\Users\PratyushBhatia\ca-mutcd-2026\training\`.

## Depth bar — read this twice

**This must be IN-DEPTH, not a summary.** Practicing engineers will use this
as an actual reference, so every Standard/Guidance/Option/Support requirement
in the source PDF must show up in your output — every number, dimension,
distance, color, condition, and cross-reference preserved exactly. You may
clean up awkward government prose for readability, but you must not compress
away substantive content or skip sections/subsections. Do not skip any
numbered `Section X.XX` in your assigned chapters. If a chapter has 40
sections, your output has 40 `<h2>` blocks. This is the single most important
instruction in this briefing — err toward completeness over concision.

## Environment

- `python3` is available with **PyMuPDF already installed** (`import fitz`).
- Extract text per page:
  ```python
  import fitz
  doc = fitz.open("2b.pdf")
  for i, page in enumerate(doc):
      text = page.get_text()
  ```
- CA MUTCD source structure: each chapter PDF contains `Section X.XX Title`
  headers, and under each section, paragraph groups labeled `Standard:`,
  `Guidance:`, `Option:`, or `Support:` (not all four always present),
  followed by numbered paragraphs (`01`, `02`, `03`...) — sometimes the
  number and text are on separate lines due to PDF text extraction. Read
  carefully and reconstruct the logical structure; don't just dump raw
  extracted text.
- Figures are captioned `Figure 2B-1. <description>` (chapter-prefixed) and
  tables are captioned `Table 2B-1. <description>`. Cross-references look
  like "(see Figure 2B-3)".

## Your output for EACH chapter file assigned to you

Read both template files first:
- `training/_template/chapter-template.html`
- (only if you were also told to build a part index — most agents are not)

For every assigned chapter PDF, produce **one HTML file** at
`training/part{N}/{letter}-{kebab-slug}.html` (e.g. `training/part2/2b-regulatory-signs.html`),
copying `chapter-template.html` exactly and:

1. Fill every `{{PLACEHOLDER}}` (breadcrumb, titles, part number/title).
2. **Leave the `<!-- SIDEBAR_NAV -->` and `<!-- PAGER -->` comment markers
   exactly as-is** — do not build the chapter list or prev/next links
   yourself; those are injected afterward by an orchestration script once
   all chapters are known. Do not delete the marker comments.
3. Write the full in-depth body content per the instructions embedded as
   HTML comments inside the template (Standard/Guidance/Option/Support
   callouts with numbered `.para-list` items, tables, figures, an "In
   practice" tip where genuinely useful, and a closing `.takeaways` box).
4. Use heading ids in the exact form `id="sec-{letter}-{NN}"` lowercase,
   e.g. `id="sec-2b-04"` for Section 2B.04 — the injection script matches
   on this pattern.

## Figures — extraction method

Render the PDF page containing each figure/table using PyMuPDF at ~2x zoom,
save as PNG under `training/assets/img/part{N}/{chapter-slug}/fig-{NN}.png`
(e.g. `training/assets/img/part2/2b-regulatory-signs/fig-01.png`):

```python
import fitz, os
doc = fitz.open("2b.pdf")
os.makedirs("training/assets/img/part2/2b-regulatory-signs", exist_ok=True)
page = doc[page_index]                      # 0-based index of the figure's page
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
pix.save(f"training/assets/img/part2/2b-regulatory-signs/fig-{n:02d}.png")
```

If a page is dominated by a single figure/table, rendering the whole page is
fine. If a figure occupies only part of a page (e.g. bottom half, or one of
several sign panels on a page), pass a `clip=fitz.Rect(x0,y0,x1,y1)` to
`get_pixmap` to crop tighter — inspect `page.get_text("dict")` block bboxes
or just use reasonable visual judgment from rendering the full page first
and re-rendering with a clip once you find the right box. Don't spend more
than ~2 render attempts per figure — a full-page image beats no image.

Reference each saved figure in the HTML with a relative path from the
chapter file: `../assets/img/part{N}/{chapter-slug}/fig-{NN}.png` and a real
`<figcaption>` using the source's actual figure number/caption text.

Extract every figure/diagram/sign-panel-layout that materially illustrates a
requirement (sign layouts, marking layouts, signal head arrangements, typical
application diagrams, dimension diagrams). You do not need to extract purely
decorative or duplicate images. For chapters with dozens of near-identical
sign-panel figures (common in Part 2 sign chapters), extract a representative
sample covering each distinct sign type/series and note in nearby text when
similar variants exist without a dedicated image for every single one — but
still describe those variants in text (dimensions, legend, condition of use).

## Required manifest file (one per chapter, JSON)

After writing each chapter HTML file, also write a manifest so the
orchestrator can build the site-wide sidebar, the Part index page, and the
home page consistently. Save at:
`training/_manifest/part{N}_{letter}.json`

```json
{
  "part_num": 2,
  "chapter_letter": "b",
  "chapter_code": "2B",
  "file": "2b-regulatory-signs.html",
  "title": "Regulatory Signs, Barricades, and Gates",
  "short_title": "Regulatory Signs",
  "description": "One clear sentence for a chapter card/summary.",
  "sections": [
    {"id": "sec-2b-01", "code": "2B.01", "title": "Application of Regulatory Signs"},
    {"id": "sec-2b-02", "code": "2B.02", "title": "Design of Regulatory Signs"}
  ],
  "figure_count": 12,
  "source_pages": 153
}
```

`sections` must exactly match the `<h2 id="...">` headings you actually put
in the HTML file (same ids, same order) — this drives the injected sidebar
and in-page navigation, so it must be accurate.

## Quality checklist before you finish

- [ ] No `{{...}}` placeholders remain except the two marker comments.
- [ ] Every `Section X.XX` from the source chapter appears as an `<h2>`.
- [ ] Every Standard/Guidance/Option/Support group is a distinct `.callout`.
- [ ] Numbers/dimensions/distances match the source exactly.
- [ ] Figures referenced in text actually exist as image files on disk.
- [ ] One manifest JSON per chapter, `sections` array matches the HTML ids.
- [ ] Valid HTML (matched tags), links using correct relative paths.

When done, report back: chapters completed, total figures extracted, total
sections covered, and any chapter where source content was ambiguous or you
had to make a judgment call.
