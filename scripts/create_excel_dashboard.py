"""Creates the fresh Excel dashboard (dashboard.xlsx) that mirrors the
previous Google Sheets dashboard: the same columns as apps_script/Code.gs
(COLUMNS) plus one added column, "Facebook Status", on a sheet named
"Sheet1" (same as the Apps Script SHEET_NAME), with the demo row for the
existing Hulku character pre-filled as Pending.

Run: python scripts/create_excel_dashboard.py [--out dashboard.xlsx] [--force]
Refuses to overwrite an existing dashboard unless --force is given.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from env_config import PIPELINE_ROOT
from excel_sync import COLUMNS, SHEET_NAME

DEMO_ROW = {
    "Video Title": "Dog and Cat Doing Marriage at Indian Wedding Hall",
    "Description": (
        "A cute cartoon dog groom in a cream-and-red sherwani and turban and "
        "a cartoon cat bride in a red-and-gold bridal lehenga get married in "
        "a grand, beautifully decorated Indian wedding hall with marigold "
        "garlands, fairy lights and a flower-covered stage. The dog's baraat "
        "dances in to dhol beats, the couple exchanges flower garlands "
        "(varmala) on stage while guests shower petals, and funny sweet "
        "moments follow - the dog comically fumbles the garland, the cat "
        "giggles, and everyone celebrates as the couple takes pheras around "
        "the sacred fire. Warm, festive, comedic, family-friendly cartoon "
        "style."
    ),
    "Video Length": "30s",
    "Aspect Ratio": "Vertical (9:16)",
    "Status": "Pending",
    "Progress": "",
    "Approval Status": "Pending",
    "Upload Status": "Pending",
    "YouTube Status": "Pending",
    "Facebook Status": "Pending",
    "Last Updated": "",
    "Video URL": "",
    "Failure Reason": "",
}

WIDTHS = {
    "Video Title": 32, "Description": 70, "Video Length": 12,
    "Aspect Ratio": 16, "Status": 13, "Progress": 18,
    "Approval Status": 15, "Upload Status": 14, "YouTube Status": 14,
    "Facebook Status": 15, "Last Updated": 20, "Video URL": 40,
    "Failure Reason": 40,
}


def build(out_path):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = Workbook()
    ws = wb.active
    ws.title = SHEET_NAME

    header_fill = PatternFill("solid", fgColor="1F3864")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    for j, col in enumerate(COLUMNS, start=1):
        c = ws.cell(row=1, column=j, value=col)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws.column_dimensions[c.column_letter].width = WIDTHS.get(col, 16)
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "A2"

    for j, col in enumerate(COLUMNS, start=1):
        c = ws.cell(row=2, column=j, value=DEMO_ROW.get(col, ""))
        c.alignment = Alignment(vertical="top", wrap_text=(col in ("Description", "Failure Reason")))
    ws.row_dimensions[2].height = 110

    validations = {
        "Video Length": '"15s,30s,45s,60s"',
        "Aspect Ratio": '"Vertical (9:16),Horizontal (16:9)"',
        "Status": '"Pending,In Progress,Completed,Failed"',
        "Approval Status": '"Pending,Approved,Rejected"',
    }
    for col, formula in validations.items():
        dv = DataValidation(type="list", formula1=formula, allow_blank=True)
        letter = ws.cell(row=1, column=COLUMNS.index(col) + 1).column_letter
        dv.add(f"{letter}2:{letter}200")
        ws.add_data_validation(dv)

    help_ws = wb.create_sheet("How to use")
    help_ws["A1"] = "Excel dashboard for the AI Social Media Content Automation pipeline (Muse + Hugging Face flow)."
    help_ws["A2"] = "1. Add a row: Video Title + Description, Video Length, Aspect Ratio, Status = Pending."
    help_ws["A7"] = "5. Video Length options: 15s, 30s, 45s, 60s. Aspect Ratio options: Vertical (9:16), Horizontal (16:9)."
    help_ws["A8"] = "6. Note: the free Hugging Face engine builds each scene from ~8s LTX clips, so delivered length is approximate (e.g. a 30s run delivers ~24s from 3 chained scenes)."
    help_ws["A3"] = "2. Mention 'Hulku' in the Title/Description to use the locked Hulku character (config/characters/hulku.md)."
    help_ws["A4"] = "3. The pipeline claims the oldest Pending row, writes Progress/Status back here as it runs, and stores the final Video URL."
    help_ws["A5"] = "4. After your approval, Upload Status / YouTube Status / Facebook Status are updated with the publish results."
    help_ws["A6"] = "Managed by scripts/excel_sync.py - see docs/DEMO_RUNBOOK.md."
    for r in range(1, 9):
        help_ws.cell(row=r, column=1).alignment = Alignment(wrap_text=False)
    help_ws.column_dimensions["A"].width = 130

    wb.save(out_path)
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=os.path.join(PIPELINE_ROOT, "dashboard.xlsx"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if os.path.exists(args.out) and not args.force:
        raise SystemExit(f"{args.out} already exists - pass --force to overwrite.")
    build(args.out)
    print(f"Created {args.out}")
