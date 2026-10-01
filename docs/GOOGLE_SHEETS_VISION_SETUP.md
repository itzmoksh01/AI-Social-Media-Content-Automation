# Google Sheets Control Plane — Setup (Vision Flow)

One-time setup on the owner's Google account. No Google Cloud Console needed.

## Sheet layout

Create a new Google Sheet. In row 1, write these exact headers in order
(A through O):

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Video Title | Description | Video Length | Aspect Ratio | Status | Progress | Video URL | Approval Status | Upload Status | YouTube Status | Facebook Status | Instagram Status | Published Info | Failure Reason | Last Updated |

Recommended data validation (Data → Data validation):
- **Video Length**: dropdown `15, 30, 45, 60`
- **Aspect Ratio**: dropdown `9:16, 16:9`
- **Status**: dropdown `Pending, In Progress, Completed, Failed`

The owner only fills **A–D** and sets **E = Pending**. Everything else is
written by the automation.

## Apps Script bridge

1. In the sheet: **Extensions → Apps Script**.
2. Delete the default `Code.gs` content, paste the entire
   `apps_script/Code.gs` from this repo, **Save**.
3. Left sidebar → gear icon (**Project Settings**) → **Script Properties** →
   **Add script property** → Property: `SHARED_SECRET`, Value: a random
   string you invent (mash the keyboard). Save. **Keep this value** — the
   automation needs the exact same string, entered via the secure connector
   page (never in chat).
4. **Deploy → New deployment** → gear icon → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** (the shared secret is what actually protects it)
5. Authorize when asked (Advanced → Go to project (unsafe) → Allow — normal
   for a personal script).
6. Copy the **Web app URL** (`https://script.google.com/macros/s/.../exec`).

## Hand over to the automation

- The **Web app URL** can be shared in chat (it is not secret by itself).
- The **SHARED_SECRET** goes only through the secure connector page the
  assistant provides — never in chat.

After that the assistant wires: sheet polling cron → video generation →
approval email → Gmail reply watcher → publishing → failure alerts.
