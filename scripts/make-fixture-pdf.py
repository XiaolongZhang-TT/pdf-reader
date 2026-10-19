"""Generate the small end-to-end fixture PDF (no third-party dependencies).

The document has 4 pages and a nested outline where several entries point at
page 2. That structure is used by the E2E test to guard against the regression
where multiple outline rows were highlighted at the same time.
"""
from __future__ import annotations

from pathlib import Path

OUT = Path("e2e/fixtures/outline.pdf")
WIDTH, HEIGHT = 612, 792

def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

BODY = (
    "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu "
    "nu xi omicron pi rho sigma tau upsilon phi chi psi omega."
)

def page_content(title: str, lines: list[str]) -> bytes:
    ops = ["BT", "/F1 24 Tf", f"72 {HEIGHT - 100} Td", f"({esc(title)}) Tj", "ET"]
    y = HEIGHT - 140
    for line in lines:
        ops += [
            "BT",
            "/F1 10 Tf",
            f"72 {y} Td",
            f"({esc(line)}) Tj",
            "ET",
        ]
        y -= 16
    return ("\n".join(ops) + "\n").encode("latin-1")

pages = [
    page_content(
        "Paper E2E Fixture",
        ["Search for alpha or open the outline to navigate."]
        + [BODY * 2] * 12,
    ),
    page_content(
        "Section 1",
        ["1.1 Alpha", BODY * 2, BODY * 2, BODY * 2, "1.2 Beta", BODY * 2, BODY * 2],
    ),
    page_content(
        "Section 2",
        ["2.1 Gamma", BODY * 2, BODY * 2, BODY * 2, BODY * 2, BODY * 2, BODY * 2],
    ),
    page_content("Section 3", [BODY * 2] * 12),
]

# object numbers -----------------------------------------------------------------
CATALOG = 1
PAGES = 2
FONT = 3
PAGE_IDS = [4, 6, 8, 10]
CONTENT_IDS = [5, 7, 9, 11]
OUTLINES = 12
ITEM_IDS = {
    "section-1": 13,
    "1.1": 14,
    "1.2": 15,
    "section-2": 16,
    "section-3": 17,
    "2.1": 18,
}

objects: dict[int, bytes] = {}

def add(number: int, body: str | bytes):
    objects[number] = body.encode("latin-1") if isinstance(body, str) else body

add(CATALOG, f"<< /Type /Catalog /Pages {PAGES} 0 R /Outlines {OUTLINES} 0 R /PageMode /UseOutlines >>")
add(PAGES, f"<< /Type /Pages /Kids [{' '.join(f'{p} 0 R' for p in PAGE_IDS)}] /Count 4 >>")
add(FONT, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
for index, (page_id, content_id, content) in enumerate(zip(PAGE_IDS, CONTENT_IDS, pages)):
    add(
        page_id,
        f"<< /Type /Page /Parent {PAGES} 0 R /MediaBox [0 0 {WIDTH} {HEIGHT}] "
        f"/Resources << /Font << /F1 {FONT} 0 R >> >> /Contents {content_id} 0 R >>",
    )
    add(content_id, f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"endstream")

page2 = PAGE_IDS[1]
page3 = PAGE_IDS[2]
page4 = PAGE_IDS[3]
dest = lambda page: f"[{page} 0 R /Fit]"

add(OUTLINES, f"<< /Type /Outlines /First {ITEM_IDS['section-1']} 0 R /Last {ITEM_IDS['section-3']} 0 R /Count 6 >>")

add(
    ITEM_IDS["section-1"],
    f"<< /Title (Section 1) /Parent {OUTLINES} 0 R /Next {ITEM_IDS['section-2']} 0 R "
    f"/First {ITEM_IDS['1.1']} 0 R /Last {ITEM_IDS['1.2']} 0 R /Count 2 /Dest {dest(page2)} >>",
)
add(
    ITEM_IDS["1.1"],
    f"<< /Title (1.1 Alpha) /Parent {ITEM_IDS['section-1']} 0 R /Next {ITEM_IDS['1.2']} 0 R /Dest {dest(page2)} >>",
)
add(
    ITEM_IDS["1.2"],
    f"<< /Title (1.2 Beta) /Parent {ITEM_IDS['section-1']} 0 R /Prev {ITEM_IDS['1.1']} 0 R /Dest {dest(page2)} >>",
)
add(
    ITEM_IDS["section-2"],
    f"<< /Title (Section 2) /Parent {OUTLINES} 0 R /Prev {ITEM_IDS['section-1']} 0 R "
    f"/Next {ITEM_IDS['section-3']} 0 R /First {ITEM_IDS['2.1']} 0 R /Last {ITEM_IDS['2.1']} 0 R "
    f"/Count 1 /Dest {dest(page3)} >>",
)
add(
    ITEM_IDS["2.1"],
    f"<< /Title (2.1 Gamma) /Parent {ITEM_IDS['section-2']} 0 R /Dest {dest(page3)} >>",
)
add(
    ITEM_IDS["section-3"],
    f"<< /Title (Section 3) /Parent {OUTLINES} 0 R /Prev {ITEM_IDS['section-2']} 0 R /Dest {dest(page4)} >>",
)

# serialize ----------------------------------------------------------------------
max_id = max(objects)
out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
offsets = [0] * (max_id + 1)
for number in range(1, max_id + 1):
    offsets[number] = len(out)
    out += f"{number} 0 obj\n".encode()
    out += objects[number]
    out += b"\nendobj\n"

xref_offset = len(out)
out += f"xref\n0 {max_id + 1}\n".encode()
out += b"0000000000 65535 f \n"
for number in range(1, max_id + 1):
    out += f"{offsets[number]:010d} 00000 n \n".encode()
out += (
    f"trailer\n<< /Size {max_id + 1} /Root {CATALOG} 0 R >>\n"
    f"startxref\n{xref_offset}\n%%EOF\n"
).encode()

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(out)
print(f"wrote {OUT} ({len(out)} bytes)")
