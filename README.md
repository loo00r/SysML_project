# SysML_project

# 🚀 AI SysML Modeling Project Plan

## 📅 Timeline: 1 month detailed breakdown

---

### ✅ Week 1: Setup & Data Preparation

#### 🔧 1.1. Environment Setup
- [ ] Create Git repository
- [ ] Set up Python environment (FastAPI or Flask for API backend)
- [ ] Connect basic frontend template (HTML/JS, GoJS, or Mermaid)
- [ ] Setup GPT API access or local LLM model

#### 📂 1.2. Data Collection & Initial Exploration
- [ ] Search and download datasets for flood events:
  - Sensor data (CSV format)
  - Historical flood incident reports (text format)
  - Geospatial data (GeoJSON/Shapefile)
- [ ] Confirm dataset relevance to UAV flood-response scenarios

#### 🛠️ 1.3. Data Preprocessing
- [ ] Script to parse textual requirements (paragraph extraction → JSON)
- [ ] Script to convert sensor CSV data into structured JSON
- [ ] Prepare geospatial data (GeoJSON or shapefile)

#### 🧪 1.4. First Mini Test
- [ ] Single requirement text → parser → JSON output validation

---

### 🤖 Week 2: AI/NLP Module & SysML Mapping

#### 🔍 2.1. NLP Entity Extraction
- [ ] Entity extraction script (sensors, UAV components, flows)
- [ ] Relation extraction script (connections and interactions)

#### 📝 2.2. GPT-based Generation
- [ ] Prompt design for generating SysML textual descriptions
- [ ] Transform text outputs into structured JSON (blocks, connections)

#### 📊 2.3. SysML Draft Mapping
- [ ] Generate initial JSON-based SysML diagrams from NLP outputs

#### ✅ 2.4. Validation Rules
- [ ] Basic validation logic (check for blocks, flows, and connectors)

---

### 🎨 Week 3: Frontend UI & Export Module

#### 🖥️ 3.1. User Interface Development
- [ ] Basic webpage to display JSON SysML diagrams
- [ ] Implement drag & drop library for manual editing
- [ ] Add validation button for diagrams
- [ ] Add export functionality button (download diagrams)

#### 📤 3.2. Export Module
- [ ] Implement JSON → XMI conversion for SysML export
- [ ] Test local file saving functionality

---

### 📖 Week 4: Finalization & Technical Reporting

#### 🗺️ 4.1. Disaster-Specific Validation
- [ ] Spatial validation of UAV coverage vs flood zones

#### 🛠️ 4.2. Optimization & Testing
- [ ] Refactor and structure codebase clearly
- [ ] Write unit tests for key functionalities

#### 📑 4.3. Technical Report Writing (**fully human-written**)
- [ ] Project architecture overview (1-2 pages)
- [ ] Explain AI/NLP processing pipeline (2-3 pages)
- [ ] Describe SysML mapping logic (2-3 pages)
- [ ] Explain validation and export systems (2 pages)
- [ ] Conclusions and future work recommendations (1 page)

---
