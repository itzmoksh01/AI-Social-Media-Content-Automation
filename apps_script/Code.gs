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
 * spreadsheet, then add a second file: click "+" next to Files > choose
 * "HTML" > name it exactly "Dashboard" > paste Dashboard.html there.
 * Set the SHARED_SECRET Script Property (Project Settings >
 * Script Properties — NOT hardcoded here, this file is version controlled),
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * Public LIVE dashboard (no login needed): <your-exec-url>?view=dashboard
 * Live JSON feed used by the dashboard: <your-exec-url>?action=publicRows
 *   (cached 30s via CacheService so 10s dashboard polling stays in quota)
 * Durable video hosting (secret action, POST JSON): action=upload_video with
 *   {name, mime, data(base64)} -> permanent Drive link (file-host links die
 *   in ~2 days; Drive links never expire). Needs Drive scope on re-deploy.
 *
 * After (re)deploying, run the "setup_sheet" action once via the bridge —
 * it writes headers, adds dropdowns + input limits, and applies the premium
 * styling (frozen header, column widths, banding, status color coding).
 */

var SHARED_SECRET = PropertiesService.getScriptProperties().getProperty("SHARED_SECRET");

var SHEET_NAME = "Sheet1";
// Order here MUST exactly match the physical column order in the sheet
// (A, B, C, ...) - this maps by position, not by header text.
var COLUMNS = [
  "Video Title",      // A - owner input, max 100 chars
  "Description",      // B - owner input, max 500 chars
  "Video Length",     // C - owner input: 15 / 30 / 45 / 60
  "Aspect Ratio",     // D - owner input: Vertical (9:16) / Horizontal (16:9)
  "Status",           // E - Pending / In Progress / Completed / Failed
  "Progress",         // F - 0-100%
  "Video URL",        // G - link to the finished video
  "Approval Status",  // H - Pending / Approved / Rejected
  "Upload Status",    // I - Pending / Done / Partial / Failed / Blocked — social accounts pending
  "YouTube Status",   // J - timestamp or error
  "Facebook Status",  // K - timestamp or error
  "Instagram Status", // L - timestamp or error
  "Published Info",   // M - human summary: platform + time
  "Failure Reason",   // N - what went wrong, if anything
  "Last Updated"      // O - ISO timestamp of last automation write
];

function doGet(e) {
  if (!e) return _json({ ok: true, usage: "use ?view=dashboard or ?action=publicRows" });
  var params = (e && e.parameter) || {};
  // Public LIVE dashboard — no secret needed (read-only UI).
  // Anyone with the link can watch the automation: <exec-url>?view=dashboard
  if (params.view === "dashboard") {
    return HtmlService.createHtmlOutputFromFile("Dashboard")
        .setTitle("Social Content Automation — LIVE")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // Public read-only rows feed for the dashboard — no secret needed.
  // (Titles/descriptions are intentionally public on this endpoint.)
  if (params.action === "publicRows") {
    return _json(_publicRowsCached());
  }
  var body = {
    action: params.action,
    secret: params.secret,
    row: params.row ? Number(params.row) : undefined
  };
  if (params.values) {
    try {
      body.values = JSON.parse(params.values);
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
  // The shared secret travels as a URL query param (vault surrogate);
  // merge it into the body so _handle can verify it for POST actions too.
  if (!body.secret && e.parameter && e.parameter.secret) {
    body.secret = e.parameter.secret;
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
      case "setup_sheet":
        _setupSheet();
        return _json({ ok: true, setup: "headers + dropdowns + limits + premium styling applied" });
      case "upload_video":
        return _json(_uploadVideo(body));
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
    var v = values[colName];
    if (colName === "Progress") v = _normalizeProgress(v);
    sheet.getRange(rowNumber, colIndex + 1).setValue(v);
  }
  SpreadsheetApp.flush();
  _bustRowsCache();
}

function _normalizeProgress(v) {
  // Keep the Sheet UI pretty: "1" -> "100%", 0.05 -> "5%", "5%" stays as-is.
  if (v === null || v === undefined || v === "") return v;
  var s = String(v).trim();
  if (/%$/.test(s)) return s;
  var n = Number(s);
  if (isNaN(n)) return v;
  if (n > 0 && n <= 1) n = Math.round(n * 100);
  return Math.round(n) + "%";
}

// --- publicRows cache: the dashboard polls every 10s, so cache the sheet
// read for 30s to stay well inside Apps Script quotas. Busted on writes.
var _ROWS_CACHE_TTL = 30;
function _publicRowsCached() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("publicRows");
  if (hit) {
    var parsed = JSON.parse(hit);
    parsed.cached = true;
    return parsed;
  }
  var payload = { ok: true, rows: _getRows(), generatedAt: new Date().toISOString() };
  try { cache.put("publicRows", JSON.stringify(payload), _ROWS_CACHE_TTL); } catch (err) {}
  return payload;
}
function _bustRowsCache() {
  try { CacheService.getScriptCache().remove("publicRows"); } catch (err) {}
}

// --- durable video hosting: file-host links expire in ~2 days, but the
// sheet/dashboard need a link that NEVER dies. This stores the final video
// in the owner's own Google Drive ("Social Content Automation — Videos")
// with anyone-with-link view access and returns a permanent direct URL.
function _uploadVideo(body) {
  if (!body.name || !body.data) throw new Error("upload_video needs name + data (base64)");
  var blob = Utilities.newBlob(
      Utilities.base64Decode(body.data), body.mime || "video/mp4", body.name);
  var file = _videoFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var id = file.getId();
  return {
    ok: true,
    fileId: id,
    url: "https://drive.google.com/uc?export=download&id=" + id,
    previewUrl: file.getUrl()
  };
}
function _videoFolder() {
  var name = "Social Content Automation — Videos";
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

// ---------------------------------------------------------------------------
// One-time premium setup: headers + dropdowns + input limits + styling.
// Safe to re-run any time; it only touches formatting/validation, never
// deletes the owner's video rows.
// ---------------------------------------------------------------------------
function _setupSheet() {
  var sheet = _sheet();
  var NCOLS = COLUMNS.length; // 15
  var NROWS = 999;            // validation/formatting covers rows 2..1000

  // 1. Headers (row 1)
  sheet.getRange(1, 1, 1, NCOLS).setValues([COLUMNS]);

  // 2. Premium header bar
  var header = sheet.getRange(1, 1, 1, NCOLS);
  header.setBackground("#1B1F3B")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold")
        .setFontSize(11)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(true);
  sheet.setRowHeight(1, 44);
  sheet.setFrozenRows(1);

  // 3. Column widths (A..O)
  var widths = [280, 420, 110, 150, 130, 90, 320, 130, 220, 150, 150, 150, 220, 300, 175];
  for (var w = 0; w < widths.length; w++) {
    sheet.setColumnWidth(w + 1, widths[w]);
  }

  // 4. Owner-input validations (rows 2..1000)
  sheet.getRange(2, 1, NROWS, 1).setDataValidation(
      _textLenRule("A", 100, "Video Title: max 100 characters (YouTube title limit)."));
  sheet.getRange(2, 2, NROWS, 1).setDataValidation(
      _textLenRule("B", 500, "Description: max 500 characters."));
  sheet.getRange(2, 3, NROWS, 1).setDataValidation(
      _listRule(["15", "30", "45", "60"], "Video Length: 15, 30, 45 ya 60 seconds me se chuno."));
  sheet.getRange(2, 4, NROWS, 1).setDataValidation(
      _listRule(["Vertical (9:16)", "Horizontal (16:9)"], "Aspect Ratio: Vertical (9:16) ya Horizontal (16:9)."));
  sheet.getRange(2, 5, NROWS, 1).setDataValidation(
      _listRule(["Pending", "In Progress", "Completed", "Failed"],
                "Status automation khud update karta hai. Dobara try karne ke liye Pending wapas karo."));
  sheet.getRange(2, 8, NROWS, 1).setDataValidation(
      _listRule(["Pending", "Approved", "Rejected"], "Approval Status: Pending / Approved / Rejected."));
  sheet.getRange(2, 9, NROWS, 1).setDataValidation(
      _listRule(["Pending", "Done", "Partial", "Failed", "Blocked \u2014 social accounts pending"],
                "Upload Status automation update karta hai."));

  // 5. Alternating row banding (premium look)
  sheet.getRange(2, 1, NROWS, NCOLS).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);

  // 6. Status color coding
  var statusRange = sheet.getRange(2, 5, NROWS, 1);
  sheet.setConditionalFormatRules([
    _statusRule(statusRange, "Pending", "#FEF3C7", "#92400E"),
    _statusRule(statusRange, "In Progress", "#DBEAFE", "#1E40AF"),
    _statusRule(statusRange, "Completed", "#D1FAE5", "#065F46"),
    _statusRule(statusRange, "Failed", "#FEE2E2", "#991B1B")
  ]);

  // 7. Tab color
  sheet.setTabColor("#4F46E5");

  SpreadsheetApp.flush();
}

function _listRule(values, help) {
  return SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .setHelpText(help)
      .build();
}

function _textLenRule(colLetter, max, help) {
  // Relative reference (e.g. =LEN(A2)<=100) auto-adjusts per row in the range.
  return SpreadsheetApp.newDataValidation()
      .requireFormulaSatisfied("=LEN(" + colLetter + "2)<=" + max)
      .setAllowInvalid(false)
      .setHelpText(help)
      .build();
}

function _statusRule(range, text, bg, fg) {
  return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(text)
      .setBackground(bg)
      .setFontColor(fg)
      .setRanges([range])
      .build();
}

function _json(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
