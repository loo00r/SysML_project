# 🤖 AI-Powered SysML Diagram Generator

A full-stack AI-driven system for **semi-automated generation of SysML diagrams** from natural language descriptions. Built with FastAPI, React, pgvector, and OpenAI.

---

## ✨ Features

- 🔍 Retrieval-Augmented Generation (RAG) for better diagram relevance  
- 🎨 Interactive diagram editor with **manual and AI-assisted editing**  
- 🧠 OpenAI integration for natural language understanding  
- 🧩 Modular architecture with Docker-based deployment  
- 🗂 PostgreSQL + pgvector support for semantic search

---

## 🚀 Getting Started

### ✅ Prerequisites

Make sure you have the Docker and Docker Compose installed

Tools:

| Tool       | Version        |
|------------|----------------|
| Docker     | ≥ 24.x         |
| Docker Compose plugin | included |
| Node.js    | ≥ 20.x         |
| Poetry     | ≥ 1.7.x (recommended 2.1+) |
| Python     | ≥ 3.10         |

---

## 📦 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/loo00r/SysML_project.git
cd SysML_project
```

### 2. Configure Environment
Copy the example .env file and update your OpenAI key:

```bash
cp .env.example .env
```

Then open .env and set your OpenAI credentials:
```
OPENAI_API_KEY=your_openai_key_here
```

### 🐳 Docker-Based Deployment
Build & Launch All Services
```bash
docker-compose up --build
```
🔧 Backend available at: ```http://localhost:8000```

🖥 Frontend available at: ```http://localhost:3000```

🛢 PostgreSQL + pgvector included via Docker

Make sure port ```5432``` is free or adjust in ```docker-compose.yml```. 

### 🧠 AI Components
Text-to-SysML Prompting: uses OpenAI GPT models via REST API.

Embedding Generation: for RAG, uses ```text-embedding-ada-002``` and ```pgvector```


### 🐙 Project Structure

```text
sysml-ai/
├── backend/             # FastAPI + RAG + OpenAI logic
├── frontend/            # React + ReactFlow visual editor
├── docker-compose.yml   # Full deployment
├── .env.template        # Env configuration sample
└── README.md
```

## 📤 Export & Persistence

- Diagrams are persisted in the database as JSON.
- You can extend the system to support:
  - Export as PNG or SVG
  - Download SysML in XMI or PlantUML format

---

## 🔒 Security & API Rate Limiting

- Protect your OpenAI API keys. Never hardcode them.
- Use `.env` files and secret managers in production.
- Consider implementing:
  - Request throttling or OpenAI rate-limiting strategies

---

## 🛠 Future Improvements

- ✅ Real-time collaboration
- ✅ Multi-diagram projects

---