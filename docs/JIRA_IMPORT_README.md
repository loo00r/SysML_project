# JIRA Tasks Import - Інструкція

## 📋 Що робить скрипт

`jira_tasks.py` автоматично створює всі таски з `JIRA_TASKS_BACKEND.md` у твоєму JIRA проекті.

**Створює**:
- 1 Epic: "Chain Prompting Architecture Implementation"
- 30 Tasks з усіма деталями (description, acceptance criteria, story points)
- Організовано по спринтах (4 спринти)

---

## 🔧 Налаштування

### 1. Встановити залежності

```bash
pip install requests
```

### 2. Перевірити JIRA credentials

Відкрий `jira_tasks.py` і перевір:

```python
JIRA_URL = "https://serapis.atlassian.net"
JIRA_EMAIL = "sannymasters@gmail.com"
JIRA_API_TOKEN = "ATATT3xFfGF0..."  # Твій API token
JIRA_PROJECT_KEY = "SP"  # Ключ твого проекту
```

### 3. Отримати JIRA API Token (якщо потрібно новий)

1. Йди на https://id.atlassian.com/manage-profile/security/api-tokens
2. Натисни "Create API token"
3. Назви його "Chain Prompting Import"
4. Скопіюй token і вставить в `JIRA_API_TOKEN`

---

## 🚀 Використання

### Запустити скрипт

```bash
cd /home/g00n3r/projects/SysML_project/docs
python jira_tasks.py
```

### Що побачиш

```
📖 Parsing tasks from JIRA_TASKS_BACKEND.md...
✅ Found 30 tasks

🎯 Creating Epic...
✅ Created: SP-123 - EPIC-1: Chain Prompting Architecture Implementation
✅ Epic created: SP-123

📝 Creating tasks...

[Sprint 1] Creating TASK-1: Create simplified BDD-only prompt template
✅ Created: SP-124 - TASK-1: Create simplified BDD-only prompt template

[Sprint 1] Creating TASK-2: Create dedicated IBD prompt template
✅ Created: SP-125 - TASK-2: Create dedicated IBD prompt template

...

✅ Successfully created 30/30 tasks!
🔗 Epic: https://serapis.atlassian.net/browse/SP-123

📊 Summary by Sprint:
  Sprint 1: 5 tasks, 16 points
  Sprint 2: 5 tasks, 22 points
  Sprint 3: 10 tasks, 36 points
  Sprint 4: 8 tasks, 22 points
```

---

## 📊 Що буде створено в JIRA

### Epic Structure

```
EPIC-1: Chain Prompting Architecture Implementation
├── Sprint 1: BDD/IBD Refactoring (16 points)
│   ├── TASK-1: Create BDD-only prompt (3 SP)
│   ├── TASK-2: Create IBD prompt (3 SP)
│   ├── TASK-3: Implement generate_ibd_diagram() (5 SP)
│   ├── TASK-4: Test IBD quality (3 SP)
│   └── TASK-5: Update BDD generation (2 SP)
│
├── Sprint 2: Parallel Execution (22 points)
│   ├── TASK-6: Block analysis logic (3 SP)
│   ├── TASK-7: Async IBD wrapper (5 SP)
│   ├── TASK-8: Unified endpoint (8 SP)
│   ├── TASK-9: Performance testing (3 SP)
│   └── TASK-10: Update save endpoint (3 SP)
│
├── Sprint 3: SMD & RAG (36 points)
│   ├── TASK-11: SMD database table (3 SP)
│   ├── ... (10 tasks total)
│
└── Sprint 4: Testing & Docs (22 points)
    ├── TASK-23: SMD API endpoints (5 SP)
    └── ... (8 tasks total)
```

### Кожна таска містить

**Summary**: `TASK-X: Short title`

**Description**:
```
Brief explanation of the task

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Reference: docs/UNIFIED_CHAIN_PROMPTING_PLAN.md (section X)

Dependencies: TASK-Y, TASK-Z
```

**Fields**:
- Issue Type: Task (or Epic)
- Story Points: 2-8
- Parent: Epic key
- Project: SP

---

## ⚠️ Важливо перед запуском

### 1. Backup JIRA проекту (опціонально)

Якщо хочеш бути впевнений, можеш зробити export проекту перед імпортом.

### 2. Перевірити Story Points field

JIRA має різні custom fields для Story Points. Скрипт використовує `customfield_10016`.

**Перевірити твій field**:

```bash
curl -u "sannymasters@gmail.com:YOUR_API_TOKEN" \
  "https://serapis.atlassian.net/rest/api/3/field" | jq '.[] | select(.name | contains("Story"))'
```

Якщо твій field інший (наприклад, `customfield_10024`), змінити в `jira_tasks.py`:

```python
# Line 46
if story_points:
    payload["fields"]["customfield_10024"] = story_points  # Твій field ID
```

### 3. Тестовий запуск (опціонально)

Можеш змінити `JIRA_PROJECT_KEY` на тестовий проект для перевірки.

---

## 🐛 Troubleshooting

### Error: "Field 'parent' is not valid"

**Проблема**: Твій JIRA не підтримує subtasks для Tasks.

**Рішення**: Змінити `issue_type` на "Sub-task":

```python
# Line 187
issue_type="Sub-task",  # замість "Task"
```

### Error: "customfield_10016 does not exist"

**Проблема**: Інший ID для Story Points.

**Рішення**: Знайти правильний field ID (див. розділ вище) і змінити в коді.

### Error: 401 Unauthorized

**Проблема**: Невірний API token або email.

**Рішення**: Перевірити credentials в `jira_tasks.py`.

### Tasks created without Story Points

**Проблема**: Неправильний field ID для Story Points.

**Рішення**: Знайти правильний ID або видалити рядок 46-47 якщо не потрібні SP.

---

## 🔍 Перевірка після імпорту

### 1. Перейти в JIRA Board

https://serapis.atlassian.net/jira/software/c/projects/SP/boards/X

### 2. Перевірити Epic

- Epic має 30 child tasks
- Story Points = 96
- Duration = 4 sprints

### 3. Перевірити таски

- Всі таски мають descriptions
- Acceptance criteria присутні
- Dependencies вказані
- Story Points встановлені

### 4. Організувати по спринтах

Можеш вручну розподілити таски по спринтах в JIRA:

- Sprint 1: TASK-1 to TASK-5
- Sprint 2: TASK-6 to TASK-10
- Sprint 3: TASK-11 to TASK-22
- Sprint 4: TASK-23 to TASK-30

---

## 🎯 Що далі після імпорту

### 1. Sprint Planning

- Review задач з командою
- Уточнити Story Points
- Призначити виконавців

### 2. Налаштувати Board

- Створити або використати існуючий Scrum board
- Додати Epic filter
- Налаштувати колонки (To Do, In Progress, Done)

### 3. Почати Sprint 1

- Move TASK-1 to TASK-5 в Sprint 1
- Почати роботу з TASK-1

---

## 📝 Модифікація скрипту

### Додати custom fields

Якщо хочеш додати інші поля (наприклад, Labels, Components):

```python
# In create_issue() function, add to payload["fields"]:
"labels": ["chain-prompting", "backend"],
"components": [{"name": "AI"}],
```

### Змінити Issue Type

Замість Task можна створити як Story:

```python
issue_type="Story",  # або "Bug", "Sub-task"
```

### Додати Priority

```python
# In create_issue() function:
def create_issue(..., priority="High"):
    payload["fields"]["priority"] = {"name": priority}
```

---

## 📚 Корисні посилання

- [JIRA REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [JIRA Issue Fields](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post)
- [Python requests library](https://requests.readthedocs.io/)

---

## ✅ Checklist перед запуском

- [ ] `requests` library встановлена
- [ ] JIRA credentials перевірені
- [ ] JIRA_PROJECT_KEY правильний
- [ ] Story Points field ID правильний (якщо потрібно)
- [ ] Файл `JIRA_TASKS_BACKEND.md` існує
- [ ] Backup зроблений (якщо потрібно)

**Готово? Запускай!**

```bash
python jira_tasks.py
```

---

**Created**: 2025-10-20
**Last Updated**: 2025-10-20
**Status**: Ready to use ✅
