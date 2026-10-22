"""Build the Week 11 class backup workbook: one tab per group, everything for that group on its tab.

Run:  python3 scripts/make_backup_workbook.py [groups]     (default 8)
Writes public/backup/Week11-group-backup.xlsx. Upload it once to a shared drive (OneDrive or Google Drive)
with edit access, and each group types on its own tab. The "Class view" tab collects every group's theme
and implication, so the tutor can read all groups in one place. Yellow = fill in, grey italic = example.
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

GROUPS = int(sys.argv[1]) if len(sys.argv) > 1 else 8
OUT = Path(__file__).resolve().parent.parent / "public" / "backup" / "Week11-group-backup.xlsx"

FONT = "Arial"
INK = "2B2622"
ACCENT = "7D5236"
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")
HEAD_FILL = PatternFill("solid", fgColor=ACCENT)
BAND_FILL = PatternFill("solid", fgColor="4A3A2E")
TINT_FILL = PatternFill("solid", fgColor="F3EADD")
EX_FILL = PatternFill("solid", fgColor="EFEFEF")
THIN = Side(style="thin", color="BFB6AB")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

f_body = Font(name=FONT, size=10, color=INK)
f_bold = Font(name=FONT, size=10, bold=True, color=INK)
f_head = Font(name=FONT, size=10, bold=True, color="FFFFFF")
f_band = Font(name=FONT, size=11, bold=True, color="FFFFFF")
f_title = Font(name=FONT, size=16, bold=True, color=ACCENT)
f_sub = Font(name=FONT, size=10, italic=True, color="6F665E")
f_ex = Font(name=FONT, size=10, italic=True, color="6F665E")
f_link = Font(name=FONT, size=10, underline="single", color="1F5FA8")
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(wrap_text=True, vertical="center", horizontal="center")

# Columns A..F are shared by every table on a group tab.
WIDTHS = [14, 14, 10, 46, 28, 42]
LAST = 6

wb = Workbook()


def setup(ws, widths=WIDTHS):
    ws.sheet_view.showGridLines = False
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def cell_style(cell, style="body", fill=None, align=WRAP):
    cell.font = {"body": f_body, "bold": f_bold, "ex": f_ex, "sub": f_sub, "head": f_head, "band": f_band, "link": f_link}[style]
    cell.alignment = align
    cell.border = BORDER
    if fill:
        cell.fill = fill


def span(ws, row, c1, c2, value=None, style="body", fill=None, align=WRAP):
    """Write into a merged block c1..c2 on one row, styling every cell so borders and fills show."""
    for c in range(c1, c2 + 1):
        cell_style(ws.cell(row=row, column=c), style, fill, align)
    ws.cell(row=row, column=c1, value=value)
    if c2 > c1:
        ws.merge_cells(start_row=row, start_column=c1, end_row=row, end_column=c2)
    return ws.cell(row=row, column=c1)


def band(ws, row, text):
    span(ws, row, 1, LAST, text, "band", BAND_FILL, Alignment(vertical="center"))
    ws.row_dimensions[row].height = 26


def note(ws, row, text, height=32):
    c = span(ws, row, 1, LAST, text, "sub")
    for col in range(1, LAST + 1):
        ws.cell(row=row, column=col).border = Border()
    c.alignment = WRAP
    ws.row_dimensions[row].height = height


def head(ws, row, spans):
    """spans: list of (c1, c2, label)."""
    for c1, c2, label in spans:
        span(ws, row, c1, c2, label, "head", HEAD_FILL, CENTER)
    ws.row_dimensions[row].height = 30


def dropdown(ws, ref, options):
    dv = DataValidation(type="list", formula1='"' + ",".join(options) + '"', allow_blank=True)
    dv.error = "Pick one from the list"
    ws.add_data_validation(dv)
    dv.add(ref)


def fields(ws, row, items, height=64):
    """label A:C, answer D:E (yellow), example F (grey). Returns the row of the first answer."""
    head(ws, row, [(1, 3, "What to fill in"), (4, 5, "Your group's answer"), (6, 6, "Example")])
    first = row + 1
    for i, (label, example) in enumerate(items, start=first):
        span(ws, i, 1, 3, label, "bold", TINT_FILL)
        span(ws, i, 4, 5, None, fill=INPUT_FILL)
        span(ws, i, 6, 6, example, "ex", EX_FILL)
        ws.row_dimensions[i].height = height
    return first


def build_group(ws, n):
    """One group's whole tab. Returns anchors the class view reads."""
    setup(ws)
    a = {}
    ws["A1"] = f"Group {n}"
    ws["A1"].font = f_title
    ws.row_dimensions[1].height = 28
    note(ws, 2, "Everything your group does today lives on this tab, top to bottom. One person types for the group. Yellow cells are for you, grey italic rows are examples. Use initials rather than full names.", 30)

    span(ws, 4, 1, 3, "Group name or number", "bold", TINT_FILL)
    span(ws, 4, 4, 6, f"Group {n}", fill=INPUT_FILL)
    ws.row_dimensions[4].height = 22
    head(ws, 6, [(1, 1, "Initials"), (2, 2, "Video watched"), (3, 6, "Notes")])
    for r in range(7, 13):
        span(ws, r, 1, 1, None, fill=INPUT_FILL)
        span(ws, r, 2, 2, None, fill=INPUT_FILL)
        span(ws, r, 3, 6, None, fill=INPUT_FILL)
        ws.row_dimensions[r].height = 20
    dropdown(ws, "B7:B12", ["Simon", "Sarah", "Stacey"])
    span(ws, 14, 1, 3, "Research question", "bold", TINT_FILL)
    span(ws, 14, 4, 6, "How do individuals experience and make sense of their relationships with technology in everyday life?")
    ws.row_dimensions[14].height = 34

    # ---------------- Task 1 ----------------
    row = 16
    a["t1"] = row
    band(ws, row, "TASK 1, STEP 1: CODES  (10 min, individual)")
    note(ws, row + 1, "Each person codes 3-5 moments from their own video. O = you saw or heard it, R = the participant reports it, I = your interpretation. A code is a short label for what the moment is about.", 32)
    head(ws, row + 2, [(1, 1, "Who"), (2, 2, "Video"), (3, 3, "O / R / I"), (4, 4, "Observation or excerpt (with timestamp)"), (5, 5, "Initial code"), (6, 6, "Why did you assign this code?")])
    ex = ["Example", "Simon", "R", "Simon 3:52, says without it he would be totally dependent on other people", "Independence through technology", "He links the equipment directly to doing things when he wants to."]
    for c, v in enumerate(ex, start=1):
        span(ws, row + 3, c, c, v, "ex", EX_FILL)
    ws.row_dimensions[row + 3].height = 44
    first_code = row + 4
    for r in range(first_code, first_code + 20):
        for c in range(1, 7):
            span(ws, r, c, c, None, fill=INPUT_FILL)
        ws.row_dimensions[r].height = 40
    dropdown(ws, f"B{first_code}:B{first_code + 19}", ["Simon", "Sarah", "Stacey"])
    dropdown(ws, f"C{first_code}:C{first_code + 19}", ["O", "R", "I"])

    row = first_code + 21
    band(ws, row, "TASK 1, STEP 2: SHARE AND CLUSTER  (8 min, group)")
    note(ws, row + 1, "Take turns introducing your video and sharing 2-3 observations with their codes. Group codes that belong together, then say what holds each cluster together.", 30)
    head(ws, row + 2, [(1, 3, "Related observations and codes"), (4, 5, "What connects or distinguishes them?"), (6, 6, "What might this suggest about people's relationships with technology?")])
    span(ws, row + 3, 1, 3, "Simon coffee request (6:13); Sarah lets Sinclair decide (9:28)", "ex", EX_FILL)
    span(ws, row + 3, 4, 5, "Both choose who or what they lean on.", "ex", EX_FILL)
    span(ws, row + 3, 6, 6, "People shape their own dependence.", "ex", EX_FILL)
    ws.row_dimensions[row + 3].height = 40
    for r in range(row + 4, row + 12):
        span(ws, r, 1, 3, None, fill=INPUT_FILL)
        span(ws, r, 4, 5, None, fill=INPUT_FILL)
        span(ws, r, 6, 6, None, fill=INPUT_FILL)
        ws.row_dimensions[r].height = 48
    prow = row + 13
    head(ws, prow, [(1, 3, "Discussion prompt"), (4, 6, "Notes from your discussion")])
    prompts = [
        "What similarities and differences do you notice across the experiences in the different videos?",
        "What underlying meanings might connect your observations?",
        "Why might group members have interpreted similar experiences differently?",
        "Which observations challenge the interpretation that is starting to emerge?",
    ]
    for i, p in enumerate(prompts, start=prow + 1):
        span(ws, i, 1, 3, p, "bold", TINT_FILL)
        span(ws, i, 4, 6, None, fill=INPUT_FILL)
        ws.row_dimensions[i].height = 50

    row = prow + 6
    band(ws, row, "TASK 1, STEP 3: CANDIDATE THEME  (7 min, group)")
    note(ws, row + 1, "A theme is a pattern of shared meaning organised around a central concept. It interprets what people said rather than summarising it. Keep this theme for Tasks 2 and 3.", 30)
    f1 = fields(ws, row + 2, [
        ("Working name for the theme", "People choose what they depend on"),
        ("Central organising concept", "Chosen dependence: agency shown through who or what people rely on"),
        ("2-3 supporting observations (ideally from different videos, with timestamps)", "Simon 6:13 asks carers for coffee; Sarah 9:36 calls it an agreed dynamic; Stacey 2:10 chooses Aibo"),
        ("What does this theme help us understand about relationships with technology?", "Reliance is something people actively arrange, not only something that happens to them"),
    ])
    a["t1_name"], a["t1_concept"] = f1, f1 + 1

    # ---------------- Task 2 ----------------
    row = f1 + 5
    a["t2"] = row
    band(ws, row, "TASK 2, STEP 1: CRITIQUE THE TWO THEMES  (10 min, group)")
    note(ws, row + 1, "Judge both themes. Quote timestamps when you cite evidence, and say how else the evidence could be read.", 22)
    span(ws, row + 2, 1, 3, "THEME A", "bold", TINT_FILL)
    span(ws, row + 2, 4, 6, "Technology makes everyday life better for people.", "bold")
    a_ev = [
        "Simon controls his TV, computer and wheelchair with head-operated switches (R, 1:38 to 2:31).",
        "Sinclair monitors Sarah's heart rate and reminds her to drink water (R, 4:00).",
        "Mia comes over on her own asking for attention and pets (R, 5:06).",
    ]
    for i, t in enumerate(a_ev, start=row + 3):
        span(ws, i, 1, 3, "Evidence" if i == row + 3 else None, "bold")
        span(ws, i, 4, 6, t)
        ws.row_dimensions[i].height = 28
    brow = row + 6
    span(ws, brow, 1, 3, "THEME B", "bold", TINT_FILL)
    span(ws, brow, 4, 6, "People use technology to choose who and what they depend on, and they value that arrangement because they chose it, even when others see it as a problem.", "bold")
    ws.row_dimensions[brow].height = 42
    b_ev = [
        'Simon: "without it I would be totally dependent on other people" (R, 3:52), yet still asks his carers to make him a coffee (R, 6:13); email lets him keep secrets from his parents (R, 8:37).',
        'Sarah: Sinclair "takes that weight ... makes the decisions" (R, 9:28); "an agreed-upon dynamic" (R, 9:36), in reply to the presenter calling him "quite controlling" (9:03).',
        "Stacey: after months of round-the-clock care for her dying dog (R, 1:49), she was not ready for another dog and chose Aibo (R, 2:10).",
    ]
    for i, t in enumerate(b_ev, start=brow + 1):
        span(ws, i, 1, 3, "Evidence" if i == brow + 1 else None, "bold")
        span(ws, i, 4, 6, t)
        ws.row_dimensions[i].height = 42
    mrow = brow + 5
    head(ws, mrow, [(1, 3, "Evaluation criteria"), (4, 4, "Theme A"), (5, 6, "Theme B")])
    for i, crit in enumerate(["Central organising concept", "Supporting observations", "Strengths", "Limitations or alternative interpretations"], start=mrow + 1):
        span(ws, i, 1, 3, crit, "bold", TINT_FILL)
        span(ws, i, 4, 4, None, fill=INPUT_FILL)
        span(ws, i, 5, 6, None, fill=INPUT_FILL)
        ws.row_dimensions[i].height = 58
    arow = mrow + 5
    span(ws, arow, 1, 3, "How might your own assumptions affect which theme you find convincing?", "bold", TINT_FILL)
    span(ws, arow, 4, 6, None, fill=INPUT_FILL)
    ws.row_dimensions[arow].height = 58
    rrow = arow + 2
    head(ws, rrow, [(1, 3, "Quick rating: does the theme meet this?"), (4, 4, "Theme A"), (5, 5, "Theme B"), (6, 6, "Our theme (Task 1)")])
    crit6 = ["Has a clear theme name", "Has a central organising concept", "Has evidence from 2+ interviews", "Goes beyond description", "Engages with contradiction", "Answers the research question"]
    for i, c in enumerate(crit6, start=rrow + 1):
        span(ws, i, 1, 3, c, "bold", TINT_FILL)
        for col in (4, 5, 6):
            span(ws, i, col, col, None, fill=INPUT_FILL, align=CENTER)
        ws.row_dimensions[i].height = 20
    dropdown(ws, f"D{rrow + 1}:F{rrow + 6}", ["Yes", "Partly", "No"])
    span(ws, rrow + 7, 1, 3, "Criteria met (count of Yes)", "bold")
    for col, letter in ((4, "D"), (5, "E"), (6, "F")):
        span(ws, rrow + 7, col, col, f'=COUNTIF({letter}{rrow + 1}:{letter}{rrow + 6},"Yes")', "bold", align=CENTER)
    a["met"] = rrow + 7

    row = rrow + 9
    band(ws, row, "TASK 2, STEPS 2 AND 3: REFINE AND REVISIT  (15 min, group)")
    note(ws, row + 1, "Revise the weaker theme (name, central concept, evidence or interpretation), test it, then go back to your own Task 1 theme.", 22)
    f2 = fields(ws, row + 2, [
        ("Which theme did your group judge weaker? (Theme A or Theme B)", "Theme A"),
        ("Revised theme name", "Technology as an extension of what people want to do"),
        ("Central organising concept", "Technology widens agency, with limits that people notice"),
        ("Evidence (with timestamps)", "Simon 3:52 and 6:13; Stacey 3:20 to 3:50 when Mia is grumpy after being off"),
        ("Interpretation: what does the theme say is going on?", "People value technology when it serves their own aims, and they notice where it falls short"),
    ], height=56)
    dropdown(ws, f"D{f2}", ["Theme A", "Theme B"])
    trow = f2 + 6
    head(ws, trow, [(1, 3, "Test your revision"), (4, 6, "Your answer")])
    tests = [
        "Does your revised theme explain an underlying pattern, rather than only naming a topic?",
        "What connects the observations across the interviews?",
        "Does it help answer the research question?",
        "Do any differences or contradictions complicate it?",
        "How might another researcher interpret the same observations?",
    ]
    for i, q in enumerate(tests, start=trow + 1):
        span(ws, i, 1, 3, q, "bold", TINT_FILL)
        span(ws, i, 4, 6, None, fill=INPUT_FILL)
        ws.row_dimensions[i].height = 46
    f3 = fields(ws, trow + 7, [
        ("One change that would strengthen your original theme (Task 1)", "Add a contradicting observation from another video"),
        ("Why would that change help?", "It shows the theme holds up when it is challenged"),
        ("Has your understanding of the interviews, or of your own assumptions, changed?", "We had assumed technology use was mostly positive"),
    ], height=52)

    # ---------------- Task 3 ----------------
    row = f3 + 4
    a["t3"] = row
    band(ws, row, "TASK 3: FROM THEME TO IMPLICATION  (25 min)")
    note(ws, row + 1, "A theme says what is going on. An implication names who should do or think differently, and what. Write one in 2-3 sentences that you could not have written without the data.", 30)
    span(ws, row + 2, 1, 3, "Weak example", "bold", TINT_FILL)
    span(ws, row + 2, 4, 6, "Designers should make AI study tools more trustworthy. (You could write this without any data.)", "ex", EX_FILL)
    span(ws, row + 3, 1, 3, "Stronger example", "bold", TINT_FILL)
    span(ws, row + 3, 4, 6, "AI study tools could show sources and confidence when a student prepares for an assessment, rather than in every interaction.", "ex", EX_FILL)
    ws.row_dimensions[row + 2].height = 28
    ws.row_dimensions[row + 3].height = 28
    span(ws, row + 4, 1, 3, "Our theme (from Task 1, or the revised one)", "bold", TINT_FILL)
    span(ws, row + 4, 4, 6, None, fill=INPUT_FILL)
    ws.row_dimensions[row + 4].height = 44
    span(ws, row + 5, 1, 3, "Our implication (2-3 sentences)", "bold", TINT_FILL)
    span(ws, row + 5, 4, 6, None, fill=INPUT_FILL)
    ws.row_dimensions[row + 5].height = 100
    imp = f"D{row + 5}"
    count = f'=(LEN({imp})-LEN(SUBSTITUTE({imp},".","")))+(LEN({imp})-LEN(SUBSTITUTE({imp},"?","")))+(LEN({imp})-LEN(SUBSTITUTE({imp},"!","")))'
    span(ws, row + 6, 1, 3, "Sentences (aim for 2-3)", "bold")
    span(ws, row + 6, 4, 6, count, align=Alignment(horizontal="left", vertical="top"))
    head(ws, row + 8, [(1, 3, "Self-check"), (4, 4, "Yes or No"), (5, 6, "Notes")])
    for i, c in enumerate(["Does it say something the theme does not already say (not a restatement)?", "Could we NOT have written it without this data?"], start=row + 9):
        span(ws, i, 1, 3, c, "bold", TINT_FILL)
        span(ws, i, 4, 4, None, fill=INPUT_FILL, align=CENTER)
        span(ws, i, 5, 6, None, fill=INPUT_FILL)
        ws.row_dimensions[i].height = 34
    dropdown(ws, f"D{row + 9}:D{row + 10}", ["Yes", "No"])
    span(ws, row + 12, 1, 3, "Class share card: theme (one line)", "bold", TINT_FILL)
    span(ws, row + 12, 4, 6, None, fill=INPUT_FILL)
    span(ws, row + 13, 1, 3, "Class share card: implication", "bold", TINT_FILL)
    span(ws, row + 13, 4, 6, None, fill=INPUT_FILL)
    ws.row_dimensions[row + 12].height = 36
    ws.row_dimensions[row + 13].height = 64
    a["share_theme"], a["share_impl"] = row + 12, row + 13

    # ---------------- Task 4 ----------------
    row = row + 15
    a["t4"] = row
    band(ws, row, "TASK 4: REFLECTION POST DRAFTS  (10 min, individual)")
    note(ws, row + 1, "Each person drafts about 100-150 words using examples from their own analysis: (1) Why might researchers develop different themes from the same qualitative dataset, and why does reflexivity matter? (2) What did you have to add to get from your theme to your implication? Paste the final text into Ed yourself.", 44)
    head(ws, row + 2, [(1, 1, "Who"), (2, 4, "Draft"), (5, 5, "Words"), (6, 6, "Status")])
    for r in range(row + 3, row + 8):
        span(ws, r, 1, 1, None, fill=INPUT_FILL)
        span(ws, r, 2, 4, None, fill=INPUT_FILL)
        span(ws, r, 5, 5, f'=IF(TRIM(B{r})="",0,LEN(TRIM(B{r}))-LEN(SUBSTITUTE(TRIM(B{r})," ",""))+1)', "bold", align=CENTER)
        span(ws, r, 6, 6, f'=IF(E{r}<100,"Under 100",IF(E{r}>150,"Over 150","In range"))', "bold", align=CENTER)
        ws.row_dimensions[r].height = 140
    ws.freeze_panes = "A3"
    return a


# ------------------------------------------------------------------ Start here
ws = wb.active
ws.title = "Start here"
setup(ws, [30, 70])
ws["A1"] = "Week 11: From Theme to Implication (class backup workbook)"
ws["A1"].font = f_title
ws.row_dimensions[1].height = 28
rows = [
    ("How this works", "One tab per group (Group 1, Group 2, ...). Each group works only on its own tab, top to bottom, through Tasks 1 to 4. One person types for the group."),
    ("For tutors", "Upload this file once to OneDrive or Google Drive and share it with edit access (a link for the class, or one link per group if you copy the file). The Class view tab collects every group's theme and implication so you can read all groups in one place."),
    ("Colour key", "Yellow cells are for you. Grey italic rows are examples. White cells are fixed text."),
    ("Privacy", "Use initials rather than full names, and keep personal details out of the cells."),
    ("Need more groups?", "Run: python3 scripts/make_backup_workbook.py 12   (any number)"),
]
for i, (k, v) in enumerate(rows, start=3):
    c1 = ws.cell(row=i, column=1, value=k)
    c2 = ws.cell(row=i, column=2, value=v)
    cell_style(c1, "bold", TINT_FILL)
    cell_style(c2)
    ws.row_dimensions[i].height = 48
ws.cell(row=9, column=1, value="Jump to a group").font = f_bold
anchors = {}

# ------------------------------------------------------------------ group tabs
for n in range(1, GROUPS + 1):
    anchors[n] = build_group(wb.create_sheet(f"Group {n}"), n)

# links on the start sheet
for n in range(1, GROUPS + 1):
    cell = ws.cell(row=10 + n - 1, column=1, value=f"Group {n}")
    cell.hyperlink = f"#'Group {n}'!A1"
    cell.font = f_link

# ------------------------------------------------------------------ Class view
cv = wb.create_sheet("Class view", 1)
setup(cv, [12, 30, 36, 46, 46, 14])
cv["A1"] = "Class view: every group in one place"
cv["A1"].font = f_title
cv.row_dimensions[1].height = 28
cv["A2"] = "Read-only summary. It fills itself from each group's tab. Click a group name to jump to its tab."
cv["A2"].font = f_sub
head_cells = ["Group", "Theme working name (Task 1)", "Central organising concept (Task 1)", "Share card: theme (Task 3)", "Share card: implication (Task 3)", "Criteria met by our theme"]
for c, t in enumerate(head_cells, start=1):
    cell = cv.cell(row=4, column=c, value=t)
    cell_style(cell, "head", HEAD_FILL, CENTER)
cv.row_dimensions[4].height = 34
for n in range(1, GROUPS + 1):
    r = 4 + n
    a = anchors[n]
    ref = lambda col, row, n=n: f"=IF('Group {n}'!{col}{row}=\"\",\"\",'Group {n}'!{col}{row})"
    g = cv.cell(row=r, column=1, value=f"Group {n}")
    cell_style(g, "bold", TINT_FILL)
    g.hyperlink = f"#'Group {n}'!A1"
    g.font = Font(name=FONT, size=10, bold=True, underline="single", color="1F5FA8")
    for col, (src_col, src_row) in enumerate([("D", a["t1_name"]), ("D", a["t1_concept"]), ("D", a["share_theme"]), ("D", a["share_impl"])], start=2):
        cell_style(cv.cell(row=r, column=col, value=ref(src_col, src_row)))
    cell_style(cv.cell(row=r, column=6, value=f"='Group {n}'!F{a['met']}"), "bold", align=CENTER)
    cv.row_dimensions[r].height = 64
cv.freeze_panes = "B5"

wb.calculation.fullCalcOnLoad = True  # no cached values are stored; Excel and Sheets compute the counts on open
OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print(f"wrote {OUT} with {GROUPS} group tabs")
