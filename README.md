# 🚀 AI SysML Modeling Project Plan

## 📅 Timeline: 1 month detailed breakdown

This document outlines a practical 4-week plan for delivering a semi-automated SysML diagram generation tool using FastAPI, GPT (OpenAI), and an interactive frontend.

---

## ✅ Week 1: Setup & Data Preparation + Backend Implementation

**Goal:** Functional FastAPI backend + mock response for `/parse` and basic environment setup

### 🔧 1.1. Environment Setup
- [x] Create Git repository
- [x] Set up Python environment (FastAPI for API backend)
- [ ] Connect basic frontend template (HTML/JS, GoJS, or Mermaid)
- [ ] Setup GPT API access or local LLM model
- [x] Basic Docker + docker-compose setup

### 📂 1.2. Data Collection & Initial Exploration
- [ ] Search and download datasets for flood events:
  - Sensor data (CSV format)
  - Historical flood incident reports (text format)
  - Geospatial data (GeoJSON/Shapefile)
- [ ] Confirm dataset relevance to UAV flood-response scenarios

### 🛠️ 1.3. Data Preprocessing & Basic Parser
- [ ] Script to parse textual requirements (paragraph extraction → JSON)
- [ ] Script to convert sensor CSV data into structured JSON
- [ ] Prepare geospatial data (GeoJSON or shapefile)
- [x] Set up FastAPI backend and route `/api/parse`
- [ ] Connect frontend to backend (`fetch`)
- [ ] Return mock JSON with blocks and flows

Example mock response:
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

### 🧪 1.4. First Mini Test
- [ ] Single requirement text → parser → JSON output validation

---

## 🤖 Week 2: AI/NLP Module & SysML Mapping + GPT Integration

**Goal:** Replace mock with GPT-generated structure + clean JSON schema

### 🔍 2.1. NLP Entity Extraction
- [ ] Entity extraction script (sensors, UAV components, flows)
- [ ] Relation extraction script (connections and interactions)

### 📝 2.2. GPT-based Generation
- [ ] Add `llm_service.py` using OpenAI API (text → JSON)
- [ ] Create reusable prompt template (few-shot)
- [ ] Connect `/parse` to GPT output
- [ ] Transform text outputs into structured JSON (blocks, connections)
- [ ] Format output as:
  - `blocks: [{ id, name, type }]`
  - `flows: [{ from, to, type }]`

### 📊 2.3. SysML Draft Mapping
- [ ] Generate initial JSON-based SysML diagrams from NLP outputs
- [ ] Prepare 3 example inputs + expected outputs

### ✅ 2.4. Validation Rules
- [ ] Basic validation logic (check for blocks, flows, and connectors)

---

## 🎨 Week 3: Frontend UI & Export Module

**Goal:** Create visual editable UI + validation logic

### 🖥️ 3.1. User Interface Development
- [ ] Basic webpage to display JSON SysML diagrams
- [ ] Integrate GoJS or Mermaid.js for SysML diagram rendering
- [ ] Enable drag and drop to move/edit blocks
- [ ] Add "Validate" button
- [ ] Add export functionality button (download diagrams)

### 📤 3.2. Export Module & Validation
- [ ] Implement JSON → XMI conversion for SysML export
- [ ] Test local file saving functionality
- [ ] Backend validation logic:
  - Are all block IDs unique?
  - Do all flows point to valid block IDs?
  - Are required fields filled?

---

## 📖 Week 4: Finalization & Technical Reporting

**Goal:** Export system and polish project for handoff

### 🗺️ 4.1. Disaster-Specific Validation
- [ ] Spatial validation of UAV coverage vs flood zones

### 🛠️ 4.2. Optimization & Testing
- [ ] Refactor and structure codebase clearly
- [ ] Write unit tests for key functionalities
- [ ] Create `export_to_xmi(data: dict)` function
- [ ] Add "Export" button in UI (downloads .xmi file)

### 📑 4.3. Technical Report Writing (**fully human-written**)
- [ ] Project architecture overview (1-2 pages)
- [ ] Explain AI/NLP processing pipeline (2-3 pages)
- [ ] Describe SysML mapping logic (2-3 pages)
- [ ] Explain validation and export systems (2 pages)
- [ ] Conclusions and future work recommendations (1 page)

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

- Work incrementally — small steps lead to big results
- Every function should be testable and minimal
- Use GPT only after writing a first sketch yourself
- Connect basic frontend template (HTML/JS, GoJS, or Mermaid)
- Focus on delivering a semi-automated SysML diagram generation tool