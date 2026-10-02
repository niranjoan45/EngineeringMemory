# Fixed Production Architecture & UI Rules

Under no circumstances should any of the following specifications be changed, removed, or overridden:

## 1. Theme & Styling
- **Palette**: Light industrial / beige engineering palette (`bg-em-paper`, amber accents, navy headers).
- **Restrictions**: Do NOT change colors, fonts, or spacing.

## 2. MachineScene.jsx
- The 3D viewer component is **final**.
- The component callout card is positioned at `bottom-3` (not top).
- The `showCallout` prop controls visibility.
- **Restrictions**: Do NOT move or remove it.

## 3. AppShell.jsx
- Has a persistent `DiagnoseSidePanel` pinned on the left (`340px`, `xl:flex`) on all pages except `/diagnose`, `/login`, `/signup`, `/`.
- **Restrictions**: Do NOT remove this side panel or change the layout structure.

## 4. DiagnoseSidePanel.jsx
- Shows a 300px 3D viewer + last diagnosis result (only if diagnosed today) + workflow progress bar (`25% Diagnosis → 50% Repair Done → 75% Submitted → 100% Eng. Approved`).
- **Restrictions**: Do NOT change this logic.

## 5. Diagnose.jsx
- The poll loop accepts `reasoning_status: 'ai_engine_unavailable'` as a completed diagnosis so the 3D highlight fires correctly.
- **Restrictions**: Do NOT revert this.

## 6. mysql_client.py
- `DB_FILE` is resolved using `__file__` (3 levels up to `em/`), NOT `os.getcwd()`.
- **Restrictions**: Do NOT change this path resolution.

## 7. diagnose.py
- The `/api/diagnose/recent` endpoint exists and returns the most recent diagnosis.
- **Restrictions**: Do NOT remove it.
