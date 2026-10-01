/**
 * Google Apps Script Web App — bridges the "Social Content Automation"
 * dashboard sheet with the automation engine. No Google Cloud project needed.
 *
 * Vision flow:
 *  1. Owner writes Video Title + Description + Length + Aspect Ratio in the sheet (Status=Pending)
 *  2. Automation polls, claims the row, generates the video (free HF engine)
 *  3. On success: Status=Completed, Video URL set, approval email sent
 *  4. Owner replies APPROVE/REJECT on that email -> sheet updated, approved videos auto-publish
 *  5. After publishing: Published Info records platform + timestamp
 *  6. Any failure (generation or upload): Status=Failed + email alert
 *
 * Install: paste this file into Extensions > Apps Script in the dashboard
 * spreadsheet, set the SHARED_SECRET Script Property (Project Settings >
 * Script Properties — NOT hardcoded here, this file is version controlled),
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */

var SHARED_SECRET = PropertiesService.getScriptProperties().getProperty("SHARED_SECRET");

var SHEET_NAME = "Sheet1";
// Order here MUST exactly match the physical column order in the sheet
// (A, B, C, ...) - this maps by position, not by header text.
var COLUMNS = [
  "Video Title",      // A - owner input
  "Description",      // B - owner input
  "Video Length",     // C - owner input: 15 / 30 / 45 / 60
  "Aspect Ratio",     // D - owner input: 9:16 / 16:9
  "Status",           // E - Pending / In Progress / Completed / Failed
  "Progress",         // F - 0-100%
  "Video URL",        // G - link to the finished video
  "Approval Status",  // H - Pending / Approved / Rejected
  "Upload Status",    // I - Pending / Done / Blocked (accounts pending)
  "YouTube Status",   // J - timestamp or error
  "Facebook Status",  // K - timestamp or error
  "Instagram Status", // L - timestamp or error
  "Published Info",   // M - human summary: platform + time
  "Failure Reason",   // N - what went wrong, if anything
  "Last Updated"      // O - ISO timestamp of last automation write
];

function doGet(e) {
  var body = {
    action: e.parameter.action,
    secret: e.parameter.secret,
    row: e.parameter.row ? Number(e.parameter.row) : undefined
  };
  if (e.parameter.values) {
    try {
      body.values = JSON.parse(e.parameter.values);
    } catch (err) {
      return _json({ error: "Invalid JSON in values param" }, 400);
    }
  }
  return _handle(body);
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return _json({ error: "Invalid JSON body" }, 400);
  }
  return _handle(body);
}

function _handle(body) {
  if (!SHARED_SECRET || body.secret !== SHARED_SECRET) {
    return _json({ error: "Bad secret" }, 403);
  }
  try {
    switch (body.action) {
      case "get_rows":
        return _json({ rows: _getRows() });
      case "update_row":
        _updateRow(body.row, body.values);
        return _json({ ok: true, row: body.row, updated: body.values });
      default:
        return _json({ error: "Unknown action: " + body.action }, 400);
    }
  } catch (err) {
    return _json({ error: String(err) }, 500);
  }
}

function _sheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function _getRows() {
  var sheet = _sheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var entry = { row_number: i + 2 };
    for (var j = 0; j < COLUMNS.length; j++) {
      var v = values[i][j];
      entry[COLUMNS[j]] = (v === null || v === undefined) ? "" : String(v);
    }
    rows.push(entry);
  }
  return rows;
}

function _updateRow(rowNumber, values) {
  var sheet = _sheet();
  for (var colName in values) {
    var colIndex = COLUMNS.indexOf(colName);
    if (colIndex === -1) throw new Error("Unknown column: " + colName);
    sheet.getRange(rowNumber, colIndex + 1).setValue(values[colName]);
  }
  SpreadsheetApp.flush();
}

function _json(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
