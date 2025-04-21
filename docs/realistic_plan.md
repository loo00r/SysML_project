
---

# 🚀 AI-SysML MVP – Realistic 4-Week Execution Plan

This document outlines a practical 4-week plan for delivering a semi-automated SysML diagram generation tool using FastAPI, GPT (OpenAI), and an interactive frontend.

---

## ✅ Week 1 – Backend Setup & Basic Parser

**Goal:** Functional FastAPI backend + mock response for `/parse`.

### Tasks:
- [x] Create project structure and Git repo
- [x] Set up FastAPI backend and route `/api/parse`
- [x] Basic Docker + docker-compose setup
- [x] Frontend HTML page with textarea + "Parse" button
- [ ] Connect frontend to backend (`fetch`)
- [ ] Return mock JSON with blocks and flows

```json
{
  "blocks": [
    {"id": "1", "name": "UAV", "type": "block"},
    {"id": "2", "name": "Thermal Sensor", "type": "sensor"},
    {"id": "3", "name": "Survivor Detection", "type": "process"}
  ],
  "flows": [
    {"from": "2", "to": "3", "type": "data"},
    {"from": "1", "to": "2", "type": "mounts"}
  ]
}
```

---

## 🤖 Week 2 – GPT Integration + JSON Mapping

**Goal:** Replace mock with GPT-generated structure + clean JSON schema.

### Tasks:
- [ ] Add `llm_service.py` using OpenAI API (text → JSON)
- [ ] Create reusable prompt template (few-shot)
- [ ] Connect `/parse` to GPT output
- [ ] Format output as:
  - `blocks: [{ id, name, type }]`
  - `flows: [{ from, to, type }]`
- [ ] Prepare 3 example inputs + expected outputs

---

## 🎨 Week 3 – UI + Drag & Drop + Validation

**Goal:** Create visual editable UI + validation logic.

### Tasks:
- [ ] Integrate GoJS or Mermaid.js for SysML diagram rendering
- [ ] Enable drag and drop to move/edit blocks
- [ ] Add "Validate" button
- [ ] Backend validation logic:
  - Are all block IDs unique?
  - Do all flows point to valid block IDs?
  - Are required fields filled?

---

## 📤 Week 4 – Export + Cleanup + Report

**Goal:** Export system and polish project for handoff.

### Tasks:
- [ ] Create `export_to_xmi(data: dict)` function
- [ ] Add "Export" button in UI (downloads .xmi file)
- [ ] Refactor backend codebase (split logic, testability)
- [ ] Start writing technical report (fully human-written)

### Report Outline:
- Architecture overview (1–2 pages)
- AI/GPT processing logic (2–3 pages)
- SysML JSON schema and mapping (2 pages)
- Validation logic & XMI export (1–2 pages)
- Summary and future suggestions (1 page)

---

## ✅ Deliverables by Week

| Week | Deliverable                              |
|------|------------------------------------------|
| 1    | Functional backend + mock response       |
| 2    | GPT-powered parser with JSON output      |
| 3    | UI + drag/drop editing + validation      |
| 4    | XMI export + final cleanup + report draft|

---

## 🔁 Notes

- Work incrementally — small steps lead to big results.
- Every function should be testable and minimal.
- Use GPT only after writing a first sketch yourself.

