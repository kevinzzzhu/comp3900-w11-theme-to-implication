"""Make one backup workbook per group from the template.

Run:  python3 scripts/make_group_copies.py 8 [output_dir]
Creates Week11-Group-01.xlsx ... with the group name already filled in (cell B4 on "Start here").
Upload each file to the group's shared drive (OneDrive or Google Drive) and share the link with that group.
"""
import sys
from pathlib import Path

from openpyxl import load_workbook

root = Path(__file__).resolve().parent.parent
template = root / "public" / "backup" / "Week11-group-backup.xlsx"
count = int(sys.argv[1]) if len(sys.argv) > 1 else 6
out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "output" / "groups"
out_dir.mkdir(parents=True, exist_ok=True)

for n in range(1, count + 1):
    wb = load_workbook(template)
    wb["Start here"]["B4"] = f"Group {n}"
    wb.calculation.fullCalcOnLoad = True
    wb.save(out_dir / f"Week11-Group-{n:02d}.xlsx")
print(f"wrote {count} files to {out_dir}")
