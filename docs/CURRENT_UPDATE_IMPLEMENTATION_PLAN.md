                                          # План імплементації змін з `Current_update.docx` (Flood Rescue / SAR, Validator-in-the-Loop)
            

##                                                                                                  0) Контекст і ціль
        
`Current_update.docx` описує перехід від “одного генеруючого LLM” до **асинхронного ланцюжка генерації** (BDD → IBD → SMD) з патернами:

- **Domain-Specific Constraints Injection** (Flood Rescue & Search and Rescue / SAR): вбудовування доменних правил у промпти та/або перевірки.
- **Validator-in-the-Loop**: окремий агент-валідатор (в документі — “LLM3”) перевіряє кожен крок та зупиняє/коригує генерацію (“fail-fast”).
- **Self-refinement / Chain-of-Verification**: ітеративне уточнення виходу на основі фідбеку валідатора.
- **Автоматизоване оцінювання якості (0–100)** за категоріями: completeness, correctness, standards, terminology, understandability.

Цей план описує **мінімально достатню** імплементацію у поточній апці (FastAPI + Redis + Postgres + React), без зайвого ускладнення, з опорою на існуючі ендпоїнти:

- `POST /api/v1/rag/generate-diagram-unified/` (фонова генерація BDD → IBD/SMD + Redis polling),
- `GET /api/v1/rag/diagram-result/{diagram_id}`,
- `POST /api/v1/rag/save-diagram/`,
- `POST /api/v1/create-diagram/` (імедіат-персіст).

## 0.1) Вимоги клієнта (з Research → Implementation) — MUST HAVE

Research фаза є критичною, бо задає:
- **Domain constraints** для Flood Rescue / SAR (fallback/стійкість, протоколи фаз, термінологія).
- **Semantic expectations** (що вважати “правильно/повно/стандартно”).
- **Evaluation rules** (0–100, та issues list), які далі використовує Validator-in-the-Loop (LLM3).

Цільова якість (ModRE 2024 / Ferrari et al.) вимірюється 5 категоріями:
1) **Completeness** (пропущені елементи/фази/зв’язки)
2) **Correctness** (логічний порядок, суперечності)
3) **Adherence to Standards** (коректність SysML/структури JSON)
4) **Terminology Alignment** (канонічні терміни, без hallucinated naming)
5) **Understandability** (читабельність/шум/traceability)

Поточна реалізація покриває ці категорії **частково детерміновано** (rules-driven) і **не повністю семантично** (це відповідальність Phase 4: LLM3 validator).

## 1) Ключові патерни та наукове обґрунтування

З посилань у `Current_update.docx`:

- **Self-Refine (arXiv:2303.17651)**: одна і та сама LLM генерує → дає фідбек → перегенеровує; без додаткового тренування.
- **Chain-of-Verification (arXiv:2309.11495)**: draft → план verification-питань → незалежні відповіді → фінальна відповідь; зменшує hallucinations.
- **ModRE 2024 study (arXiv:2404.06371)**: моделі часто проблемні по completeness/correctness, навіть якщо “стандартність” і “читабельність” ок.

Для нас це означає: валідатор має бути **окремим кроком** і давати структурований фідбек, який можна подати назад у генератор.

## 2) Архітектурні рішення (прийняті на основі аналізу)

### Прийняті рішення:
- **Діаграми**: BDD/IBD/SMD (поточний scope)
- **Domain switching**: `domain="sar"|"generic"` параметр (generic за замовчуванням)
- **Fail-fast політика**: critical errors → зупинка pipeline, warnings → refine
- **Self-refinement limits**: `max_iterations=2` для кожного етапу (BDD/IBD/SMD)
- **Frontend UX**: Real-time progress + quality score + issues list + timeline events
- **Infrastructure**: Redis для incremental updates + polling (SSE в майбутньому)

### 2.1. Модульна структура бекенду

1) `backend/app/domain/` (нове)
   - `sar_constraints.json` — машинозчитувані доменні правила/терміни/шаблони.
   - `constraints.py` — `build_domain_context()` для інжекції у промпти.
   - `detector.py` — auto-detection `domain`/`command_mode` (fallback, коли клієнт не передав параметри).

2) `backend/app/validation/` (нове)
   - `schemas.py` — Pydantic моделі звіту (issues, score, category scores).
   - `deterministic.py` — швидкі перевірки без LLM (структура JSON, SAR-фази, наявність fallback, термінологія).
   - `llm_validator.py` — LLM3-перевірка (опціонально/по фічефлагу, **планується у Phase 4**).
   - `refinement.py` — збірка refinement prompt (loop зараз inline у `rag_router.py`, план: винести в helper).

3) Мінімальні зміни в існуючих пайплайнах:
   - `backend/app/database/rag_router.py` (уніфікований async chain):
     - після BDD: validate (fail-fast) → (optional refine) → тільки тоді IBD/SMD.
     - під час IBD/SMD для кожного блоку: validate → (optional refine) → save payload.
   - `backend/app/diagrams/create_diagram.py` (імедіат-персіст):
     - або (а) валідувати BDD перед записом,
     - або (б) додати “validate only / dry-run” режим.

### 2.2. Контракти даних

**ValidationReport** (зберігаємо у Redis-пейлоаді, і віддаємо фронту).

#### Поточний контракт (вже реалізовано)
- `validation_report: object` (завжди об’єкт; `{}` якщо не валідовано)
- `quality_score: int (0..100)` (heuristic score на базі issues)
- `issues: [{code, severity, message, suggestion?, details?}]`
- `recommendation: "pass"|"refine"|"fail_fast"`
- `stage: "BDD"|"UNIFIED"|...`, `mode: Optional["ICS"|"GSB"]`, `counts: {critical, warning, total}`

Примітка: `quality_score` зараз **не є категорійним scoring** (completeness/correctness/…), а “best-effort” метрика для MVP.

#### Цільовий контракт (Phase 4: LLM3 validator)
- `score_by_category: {completeness, correctness, standards, terminology, understandability}`
- `score_total` (або keep `quality_score` як alias)
- стабільні `issue.location`/`diagram_ref` для traceability у UI
- `validator_model`, `validator_confidence` (опціонально)

Мінімум для першого релізу: `quality_score`, `issues`, `recommendation`.

## 3) Поетапний план імплементації

### Фаза 1 — Формалізація домену (без коду пайплайна)

Ціль: мати чіткий “source of truth” для SAR-інжекції та детермінованих валідаторів.

1) Зібрати з research-артефактів:
   - список акторів/ролей (наприклад Incident Commander),
   - список підсистем,
   - список каналів зв’язку і fallback пар,
   - стандартні SAR mission phases та допустимі порядки.

2) Оформити `docs/SAR_DOMAIN_SPEC.md` (новий документ) з:
   - терміни (must-use, should-use, forbidden/synonyms),
   - правила BDD (required blocks/modules),
   - правила IBD (внутрішні компоненти, зв’язки),
   - правила SMD (фази, обов’язкові стани/переходи, заборони).

3) З цього ж джерела згенерувати машинозчитуваний файл (JSON/YAML) для бекенду:
   - `backend/app/domain/sar_constraints.json` (мінімальна структура, без БД).

Acceptance criteria:
- Є 1 документ-спека і 1 машинний файл, який покриває принаймні 3 приклади з `Current_update.docx` (fallback, mission phases, terminology).

### Фаза 2 — Domain Injection Module (мінімальна інжекція в промпти) ⚠️ КРИТИЧНО

Ціль: щоб генератор стабільно "бачив" SAR-обмеження, навіть без LLM-валідатора.

**Статус**: ✅ 100% завершено (інжекція додана в BDD/IBD/SMD промпти + `domain`/`command_mode` прокинуті в unified flow)

**Що є**:
- ✅ `backend/app/domain/constraints.py` з `load_sar_constraints()`
- ✅ API параметр `domain` в ендпоінтах
- ✅ `detector.py` для auto-detection

**Реалізовано (ref, вже зроблено)**:

1) **Створити `build_domain_context()` function**:
   ```python
   # backend/app/domain/constraints.py
   def build_domain_context(domain: str, command_mode: Optional[str] = None) -> str:
       """
       Генерує structured prompt context для інжекції в генератори.
       Максимум 1-2k символів для економії токенів.
       """
       if domain != "sar":
           return ""

       constraints = load_sar_constraints()

       # BDD context
       required_blocks = constraints["bdd"]["required_blocks"]
       blocks_str = ", ".join(required_blocks)

       # SMD context
       required_phases = constraints["smd"]["required_phases"]
       phases_str = " → ".join(required_phases)

       # Terminology
       synonyms = constraints["terminology"]["synonyms"]
       terms_str = "\n".join([f"  - Use '{v}' instead of '{k}'" for k, v in synonyms.items()])

       # Mode-specific
       mode_str = ""
       if command_mode == "ICS":
           mode_str = "\n- Command Structure: Incident Commander → Operations Section Chief"
       elif command_mode == "GSB":
           mode_str = "\n- Command Structure: Gold Commander → Silver Commander → Bronze Commander"

       return f"""
   SAR (Search and Rescue) Domain Constraints:

   Required BDD Blocks:
   - {blocks_str}

   Required SMD Mission Phases:
   - {phases_str}

   Terminology Guidelines:
   {terms_str}
   {mode_str}

   Communications:
   - Critical roles require redundant comms (PrimaryComms + BackupComms)

   Assets:
   - Type B Boat Team: requires MotorizedRescueBoat with Motor
   - Drones: must have ReturnToHome (RTH) behavior
   """
   ```

2) **Прокинути в генератори** (3 файли):

   **A) `backend/app/AI/diagram_generation.py` → `generate_sysml_diagram()`**:
   ```python
   def generate_sysml_diagram(
       text: str,
       diagram_type: str = "bdd",
       one_shot_examples: Optional[List[Dict]] = None,
       domain: str = "generic",  # ← new param
       command_mode: Optional[str] = None,  # ← new param
   ):
       from app.domain.constraints import build_domain_context

       domain_context = build_domain_context(domain, command_mode)

       # Додати domain_context в system prompt або user prompt
       system_prompt = f"""You are a SysML expert...

       {domain_context}

       Generate a {diagram_type} diagram..."""
   ```

   **B) `generate_ibd_diagram()`** — аналогічно:
   ```python
   def generate_ibd_diagram(
       ...,
       domain: str = "generic",
       command_mode: Optional[str] = None,
   ):
       domain_context = build_domain_context(domain, command_mode)
       # Додати в промпт
   ```

   **C) `generate_state_machine_diagram()`** — аналогічно

3) **Оновити виклики в `rag_router.py`**:

   В `_generate_diagram_in_background()` передавати `domain` + `command_mode`:
   ```python
   # Line ~360
   bdd_result = await asyncio.to_thread(
       generate_sysml_diagram,
       text=text,
       diagram_type="bdd",
       one_shot_examples=bdd_examples,
       domain=domain,  # ← add
       command_mode=command_mode,  # ← add
   )

   # Line ~480 (IBD generation)
   ibd_result = await asyncio.to_thread(
       generate_ibd_diagram,
       ...,
       domain=domain,  # ← add
       command_mode=command_mode,  # ← add
   )

   # Аналогічно для SMD
   ```

**Acceptance criteria**:
- ✅ Для однакового input тексту, при `domain="sar"` промпт реально містить SAR-контекст (видно у debug-логах)
- ✅ При `domain="generic"` — промпт без domain context
- ✅ Генератор знає про required blocks/phases **ДО** валідації

**Пріоритет**: 🔴 **HIGHEST** (без цього валідатор завжди знаходитиме помилки)

### Фаза 3 — Детермінована валідація (швидко, без LLM)

Ціль: “fail-fast” на грубих помилках без токенів/вартості.

1) Реалізувати базові перевірки структури:
   - валідний JSON-формат (вже є частково в генерації),
   - BDD: є `elements[]`, `relationships[]`, у елементів є `id/type/name` мінімум.

2) SAR-специфічні перевірки (з `sar_constraints.json`):
   - **Protocol Compliance (SMD)**: присутність фаз `Alert → Deployment → Search → Rescue → Triage` (мінімум — усі присутні; “пропуск triage” = critical).
   - **Operational Resilience (BDD/IBD)**: якщо є primary link/модуль — перевірити fallback (rules-driven).
   - **Terminology Alignment**: якщо в тексті/діаграмі є “Manager” — запропонувати “Incident Commander” (або інший мапінг зі спеки).

3) Визначити severity:
   - critical → `fail_fast`
   - warning → `refine` (або `pass`, залежно від політики)

4) Повернути `ValidationReport` у Redis payload (для unified flow) та у відповідь (якщо synchronous flow).

Acceptance criteria:
- На контрольному прикладі, де SMD пропускає `Triage`, система позначає результат як `fail_fast` і **не** запускає наступні кроки ланцюжка.

### Фаза 4 — LLM3 Validator (опціональний, фічефлагом)

Ціль: додати “людиноподібну” семантичну оцінку + score 0–100, але без overengineering.

1) Додати нові env:
   - `OPENAI_VALIDATOR_MODEL` (або reuse `OPENAI_GENERATIVE_MODEL`, якщо не хочемо множити моделі).
   - `VALIDATION_ENABLE_LLM=true|false`.

2) Промпт валідатора:
   - інпут: (a) user prompt, (b) domain_context, (c) diagram JSON, (d) deterministic issues.
   - аутпут: **строго JSON**: category scores + issues + recommendation.

3) Зробити LLM-валідатор “після” детермінованого:
   - якщо детермінований уже `fail_fast` — LLM валідатор не викликаємо (економія).

Acceptance criteria:
- Валідатор повертає стабільно парсабельний JSON.
- `score_total` у межах 0–100 і корелює з кількістю/issues severity (на smoke tests).

### Фаза 5 — Self-Refinement loop (обмежений) ⚠️ КРИТИЧНО

Ціль: автоматично виправляти очевидні помилки 1–2 ітераціями.

**Статус**: ✅ ~90% (BDD refinement loop працює; incremental Redis updates + events + bounded iterations)

**Реалізовано (ref, вже зроблено)**:

1) **Створити `backend/app/validation/refinement.py`**:
   ```python
   from typing import Dict, Any, Optional
   from app.validation.schemas import ValidationReport

   def build_refinement_prompt(
       original_text: str,
       diagram_json: Dict[str, Any],
       validation_report: ValidationReport,
   ) -> str:
       """
       Генерує targeted refinement prompt на основі issues з валідатора.
       """
       issues_str = "\n".join([
           f"- [{issue.severity.upper()}] {issue.code}: {issue.message}"
           for issue in validation_report.issues
       ])

       return f"""
   The generated diagram has validation issues. Please regenerate it addressing these problems:

   {issues_str}

   Original user request: {original_text[:500]}

   Previous diagram (has issues):
   {diagram_json}

   Generate a CORRECTED version that fixes all the issues above.
   """

   async def refine_with_validation(
       generate_fn: Callable,
       validate_fn: Callable,
       initial_result: Dict[str, Any],
       text: str,
       max_iterations: int = 2,
       **kwargs,
   ) -> Dict[str, Any]:
       """
       Generic refinement loop для будь-якого генератора (BDD/IBD/SMD).
       """
       current_result = initial_result
       iteration = 0

       while iteration < max_iterations:
           # Validate
           report = validate_fn(text=text, diagram=current_result, **kwargs)

           if report.recommendation == "pass":
               return {"result": current_result, "report": report, "iterations": iteration}

           if report.recommendation == "fail_fast":
               return {"result": None, "report": report, "iterations": iteration, "error": "fail_fast"}

           if report.recommendation == "refine":
               iteration += 1
               if iteration >= max_iterations:
                   # Max iterations reached, return best effort
                   return {"result": current_result, "report": report, "iterations": iteration, "warning": "max_iterations"}

               # Build refinement prompt
               refinement_prompt = build_refinement_prompt(text, current_result, report)

               # Regenerate
               new_result = await generate_fn(
                   text=refinement_prompt,
                   **kwargs,
               )

               if new_result.get("error"):
                   # Regeneration failed, return previous
                   return {"result": current_result, "report": report, "iterations": iteration, "error": "regeneration_failed"}

               current_result = new_result

       return {"result": current_result, "report": report, "iterations": iteration}
   ```

2) **Інтегрувати в `rag_router.py`** (в `_generate_diagram_in_background()`):

   **Для BDD** (line ~360):
   ```python
   from app.validation.refinement import refine_with_validation

   # Generate initial BDD
   bdd_result = await asyncio.to_thread(
       generate_sysml_diagram,
       text=text,
       diagram_type="bdd",
       one_shot_examples=bdd_examples,
       domain=domain,
       command_mode=command_mode,
   )

   raw_bdd = bdd_result.get("diagram_raw", {})

   # Validate + Refine BDD (якщо domain=SAR)
   if domain == "sar":
       def validate_bdd(text, diagram, **kw):
           return validate_sar_unified_payload(
               text=text,
               bdd_diagram=diagram,
               mode=command_mode,
               stage="BDD",
           )

       async def regenerate_bdd(text, **kw):
           return await asyncio.to_thread(
               generate_sysml_diagram,
               text=text,
               diagram_type="bdd",
               domain=domain,
               command_mode=command_mode,
           )

       refinement_result = await refine_with_validation(
           generate_fn=regenerate_bdd,
           validate_fn=validate_bdd,
           initial_result=raw_bdd,
           text=text,
           max_iterations=2,
       )

       raw_bdd = refinement_result["result"]
       validation_report = refinement_result["report"]
       iterations_used = refinement_result["iterations"]

       # Fail-fast check
       if validation_report.recommendation == "fail_fast":
           redis_client.store_diagram({
               "status": "failed",
               "error": "BDD validation failed (critical issues)",
               "validation_report": validation_report.dict(),
           }, diagram_id=diagram_id)
           return  # Stop pipeline

       # Update Redis with BDD + validation
       redis_client.store_diagram({
           "status": "processing",
           "stage": "BDD_COMPLETED",
           "diagrams": {"bdd": {"version": iterations_used + 1, "data": raw_bdd}},
           "validation": {"bdd": validation_report.dict()},
           "events": [
               {"ts": time.time(), "type": "BDD_VALIDATED", "score": validation_report.quality_score}
           ],
       }, diagram_id=diagram_id)
   ```

   **Аналогічно для IBD/SMD** — обгорнути в refinement loop.

3) **Додати `update_redis_progress()` helper**:
   ```python
   def update_redis_progress(
       job_id: str,
       stage: str,
       current_step: str,
       diagrams: Dict,
       validation: Dict,
       event: Dict,
   ):
       existing = redis_client.get_diagram(job_id) or {}
       events = existing.get("events", [])
       events.append(event)

       redis_client.store_diagram({
           **existing,
           "stage": stage,
           "progress": {"current_step": current_step},
           "diagrams": {**existing.get("diagrams", {}), **diagrams},
           "validation": {**existing.get("validation", {}), **validation},
           "events": events,
       }, diagram_id=job_id)
   ```

**Acceptance criteria**:
- ✅ При штучно зіпсованому BDD (missing required block) система робить 1-2 перегенерації
- ✅ Якщо після 2 ітерацій все одно `refine` → повертає "best effort" з warning
- ✅ Якщо `fail_fast` → зупиняє pipeline (IBD/SMD не генеруються)
- ✅ Redis payload оновлюється після кожної ітерації з version tracking

**Пріоритет**: 🔴 **HIGH** (критично для MVP, але після Domain Injection)

### Фаза 6 — Інтеграція у фронтенд (мінімальна UX-частина)

Ціль: показати користувачу “що не так” і “яка якість”, не перевантажуючи UI.

1) Додати в відповіді `diagram-result` поля:
   - `validation_report` (summary),
   - `quality_score`.

2) На фронті:
   - маленький “Quality badge” (0–100) на вкладці/панелі,
   - список issues з severity (critical/warning) у боковій панелі.

Acceptance criteria:
- Користувач бачить score та список проблем одразу після завершення генерації.

### Фаза 7 — Тести та контроль якості (без фанатизму)

1) Unit-тести для детермінованих валідаторів:
   - mission phases порядок,
   - fallback правила,
   - terminology mapping.

2) Контрактні тести для `ValidationReport` (Pydantic):
   - парсинг, типи, граничні значення.

3) Мінімальні smoke-тести unified flow:
   - валідний пайплайн (BDD → IBD → SMD),
   - fail-fast на BDD.

Acceptance criteria:
- `poetry run pytest` проходить локально/в CI.

## 4) Scope Boundaries (що НЕ робимо в цій ітерації)

Не робимо в першій ітерації:
- окреме збереження evaluation logs у БД (можна додати пізніше, коли стабілізується формат звіту),
- складні онтології/knowledge graph для SAR (достатньо списків правил + термінів),
- багатодоменність (поки один домен або `generic`/`sar` перемикач),
- повна “CoVe” з багатьма verification питаннями (достатньо deterministic + 1 LLM оцінки).

## 5) Аналіз поточного стану (станом на 2025-12-18)

### Що вже зроблено ✅

#### Фаза 1: Формалізація домену — **100% ЗАВЕРШЕНО**
- ✅ `docs/SAR_DOMAIN_SPEC.md` — чітка специфікація з термінологією, BDD/IBD/SMD правилами
- ✅ `backend/app/domain/sar_constraints.json` — 113 рядків машинозчитуваних правил
- ✅ Покриває всі критичні категорії: terminology, mode requirements, communications, mission phases, assets

#### Фаза 3: Детермінована валідація — **100% ЗАВЕРШЕНО**
- ✅ `backend/app/validation/schemas.py` — Pydantic моделі (ValidationIssue, ValidationReport)
- ✅ `backend/app/validation/deterministic.py` — 346 рядків якісного коду з перевірками:
  - Terminology synonyms mapping
  - ICS/GSB mode mixing detection
  - BDD required blocks (fail-fast)
  - IBD communications redundancy (PACE)
  - SMD mission phases & forbidden transitions
  - Asset typing rules (Type B/D)
  - Drone safety (RTH)
- ✅ Інтеграція в `rag_router.py` (lines 378, 510)
- ✅ Unit-тести (`test_deterministic_validation.py`, `test_deterministic_validation_unittest.py`)

#### Bonus: AI Domain Detector — **ДОДАНО**
- ✅ `backend/app/domain/detector.py` — LLM-based domain/command_mode classifier
- ✅ `OPENAI_DETECTOR_MODEL` config (default: gpt-4o-mini)
- ✅ Auto-detection fallback коли клієнт не передає domain parameter

#### Фаза 2: Domain Injection — ✅ **100% ЗАВЕРШЕНО**
- ✅ `build_domain_context()` інтегровано в `generate_sysml_diagram()` / `generate_ibd_diagram()` / `generate_state_machine_diagram()`.
- ✅ `domain`/`command_mode` прокинуті через unified async flow у всі генератори.

#### Фаза 5: Self-Refinement — ✅ **~90% (BDD тільки)**
- ✅ BDD: bounded refinement loop (max 2) з подіями (`events`), `bdd_version`, і fail-fast skip IBD/SMD.
- ⚠️ НЕ ЗРОБЛЕНО: per-block refinement/validation для IBD/SMD (клієнтське очікування “validator at every step”).
- ⚠️ TODO: винести refinement loop у reusable helper і (за потреби) розширити на IBD/SMD.

### Що не завершено ⚠️

#### Фаза 4: LLM3 Validator — 🔴 **0%**
- ❌ Немає `llm_validator.py` та фічефлагів (`VALIDATION_ENABLE_LLM`, `OPENAI_VALIDATOR_MODEL`) у `settings`.
- ❌ Немає категорійного scoring (5 категорій ModRE/Ferrari), лише heuristic `quality_score`.

#### Фаза 6: Frontend Integration — 🟡 **~10%**
- ✅ Backend віддає `events`, `validation_report`, `quality_score`, `bdd_version`, і progress counters для subdiagrams.
- ❌ UI компоненти (timeline/quality/issues/polling UX) ще не додані.

#### Фаза 7: Тести — 🟡 **40%**
- ✅ Unit-тести для детермінованої SAR валідації
- ❌ Немає smoke-tests для unified flow (fail-fast/refine paths)
- ⚠️ Немає простого CI runner (Poetry/Docker) для автозапуску тестів

### Загальний прогрес: **~75%**

### Критичні проблеми для вирішення
1. **Frontend не показує validation/progress/timeline** — UX неповний
2. **Validator-in-the-loop не інтегрований “на кожен крок” для IBD/SMD** (зараз: BDD + фінальний UNIFIED)
3. **Progress payload не повністю структурований** (немає стабільного `{done,total,current_step}` для всіх кроків)
4. **Refinement DRY/helper** — зараз BDD loop inline, IBD/SMD без refinement
5. **Smoke/CI тести** для unified flow

---

## 6) Real-time Frontend Updates (Incremental Progress Visualization)

### Ціль
Показувати користувачу **майже real-time** прогрес генерації + валідації + refinement на UI без WebSocket.

### Архітектура: Polling + Incremental Redis Updates

#### Backend зміни (мінімальні)

**Розширена Redis Payload структура**:

```json
{
  "job_id": "08ca4f...",
  "status": "running" | "completed" | "failed",
  "stage": "BDD" | "IBD" | "SMD" | "VALIDATION" | "REFINEMENT",
  "progress": {
    "done": 3,
    "total": 11,
    "current_step": "Validating BDD v2"
  },

  "diagrams": {
    "bdd": {
      "version": 2,
      "data": { "elements": [], "relationships": [] }
    },
    "ibd": {
      "blocks": {
        "block-3": {
          "version": 1,
          "data": { "nodes": [], "edges": [] }
        }
      }
    },
    "smd": {
      "blocks": {
        "block-5": {
          "version": 1,
          "data": { "nodes": [], "edges": [] }
        }
      }
    }
  },

  "validation": {
    "bdd": {
      "version": 2,
      "quality_score": 82,
      "recommendation": "pass",
      "issues": [
        {"code": "TERMINOLOGY_SYNONYM_USED", "severity": "warning", "message": "..."}
      ]
    },
    "ibd:block-3": {
      "quality_score": 71,
      "recommendation": "refine",
      "issues": []
    }
  },

  "events": [
    { "ts": 1734384234, "type": "BDD_GENERATED", "msg": "BDD v1 generated", "version": 1 },
    { "ts": 1734384235, "type": "BDD_VALIDATED", "msg": "Score 64, refine", "score": 64 },
    { "ts": 1734384238, "type": "BDD_REFINED", "msg": "BDD v2 generated", "version": 2 },
    { "ts": 1734384239, "type": "BDD_VALIDATED", "msg": "Score 82, pass", "score": 82 },
    { "ts": 1734384240, "type": "IBD_STARTED", "msg": "Generating 3 IBDs" },
    { "ts": 1734384242, "type": "IBD_COMPLETED", "msg": "IBD for block-3 done" }
  ]
}
```

**Ключові принципи**:
- `version` інкрементується при кожному regenerate (для відстеження змін)
- `events[]` дає timeline для UI (стрічка прогресу)
- **Payload оновлюється після кожного кроку**: generate → validate → refine → validate

**Backend implementation checklist**:
- [ ] Додати helper `update_redis_progress(job_id, stage, step, diagrams, validation, event)`
- [ ] Викликати після кожного: generate_bdd → validate_bdd → refine_bdd → generate_ibd → validate_ibd
- [ ] Додати `version` tracking для BDD/IBD/SMD
- [ ] Генерувати structured events

#### Frontend зміни

**Polling strategy**:
- Інтервал: 0.5-1.0 сек коли `status="running"`, 3-5 сек коли `status="completed"`
- Adaptive: якщо `events.length` не змінюється 3 рази підряд → збільшити інтервал

**UI Components** (нові):

1. **Generation Timeline** (стрічка подій)
   ```tsx
   <Timeline events={payload.events} />
   // Показує: "BDD v1 generated → Score 64 (refine) → BDD v2 generated → Score 82 (pass)"
   ```

2. **Progress Indicator**
   ```tsx
   <LinearProgress
     value={payload.progress.done / payload.progress.total * 100}
     label={payload.progress.current_step}
   />
   ```

3. **Quality Badge** (per-diagram)
   ```tsx
   <Chip
     label={`Score: ${validation.quality_score}/100`}
     color={validation.quality_score >= 80 ? 'success' : 'warning'}
   />
   ```

4. **Issues Panel** (розгортається)
   ```tsx
   <IssuesList
     issues={validation.issues}
     showSeverity={true}
     groupBy="code"
   />
   ```

5. **Version Indicator** (для tracking змін)
   ```tsx
   <Typography variant="caption">
     BDD v{diagrams.bdd.version}
   </Typography>
   ```

**UX Flow приклад**:
```
User submits prompt
  ↓
[Timeline] "Starting generation..."
[Progress] 0/11 steps
  ↓
[Timeline] "BDD v1 generated"
[Canvas] Shows BDD (можливо "draft" watermark)
[Progress] 1/11
  ↓
[Timeline] "Validating BDD v1..."
[Progress] 2/11
  ↓
[Timeline] "BDD validation: Score 64, refining..."
[Badge] Score: 64/100 (warning)
[Issues] • TERMINOLOGY_SYNONYM_USED: Use "Incident Commander" instead of "Manager"
  ↓
[Timeline] "BDD v2 generated (refined)"
[Canvas] Updates BDD (highlight changes or show full diagram)
[Progress] 3/11
  ↓
[Timeline] "BDD validation: Score 82, pass ✓"
[Badge] Score: 82/100 (success)
[Progress] 4/11
  ↓
[Timeline] "Generating 3 IBDs..."
[Progress] 5/11
...
```

### Implementation Priorities

**Phase 6A: Backend Incremental Updates** (1-2 дні)
1. Додати `update_redis_progress()` helper
2. Інтегрувати в усі кроки unified chain
3. Додати `version` tracking
4. Генерувати events

**Phase 6B: Frontend Polling + Timeline** (2-3 дні)
1. Створити `useGenerationProgress` hook з adaptive polling
2. Timeline component (Material-UI Stepper або custom)
3. Progress bar з current step
4. Quality badge на вкладках діаграм

**Phase 6C: Issues Panel + Version Tracking** (1-2 дні)
1. Issues list з severity filtering
2. Version indicator на canvas
3. (Optional) Change highlighting при version update

**Total estimate**: 4-7 днів для повного real-time UX

### Альтернатива: SSE (Server-Sent Events) — для наступної ітерації

Якщо polling створює надмірне навантаження, можна замінити на SSE:

**Backend**:
```python
@router.get("/rag/stream/{job_id}")
async def stream_generation_progress(job_id: str):
    async def event_generator():
        while True:
            payload = redis_client.get_diagram(job_id)
            yield f"data: {json.dumps(payload)}\n\n"
            if payload["status"] in {"completed", "failed"}:
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Frontend**:
```tsx
const eventSource = new EventSource(`/api/v1/rag/stream/${jobId}`);
eventSource.onmessage = (e) => {
  const payload = JSON.parse(e.data);
  updateDiagramState(payload);
};
```

**Плюси SSE**:
- Менше HTTP requests
- Справжній real-time (push замість pull)
- Простіше за WebSocket

**Мінуси**:
- Потребує додаткової інфраструктури (SSE підтримка в nginx/load balancer)
- Складніше для debugging

**Рекомендація**: Почати з polling (простіше), потім мігрувати на SSE якщо performance стане проблемою.

---

## 7) Definition of Done (DoD) для релізу

### Мінімальний MVP (для internal testing)
- [x] Детермінована валідація працює + тести ✅
- [x] SAR domain spec формалізовано ✅
- [x] Domain injection прокинута в генератори ✅ **(DONE v1.2.35)**
- [x] Fail-fast зупиняє IBD/SMD генерацію при critical errors ✅ **(DONE v1.2.36)**
- [x] Self-refinement працює з `max_iterations=2` (BDD) ✅ **(DONE v1.2.36)**
- [x] Redis payload містить `validation_report` (об’єкт) + `quality_score` ✅ **(DONE v1.2.37)**
- [x] Redis payload має `events` + `bdd_version` (мінімально) ✅ **(DONE v1.2.36)**
- [x] `OPENAI_DETECTOR_MODEL` в .env ✅ **(DONE v1.2.37)**
- [x] Гарантована акумуляція `events` між апдейтами (без втрат) ✅ **(DONE v1.2.39)**
- [ ] Per-step validation для IBD/SMD (per block) + (optional) refine ❌ **(TODO)**
- [ ] Frontend показує progress + timeline + quality score + issues ❌ **(TODO)**

### Production-ready
- [ ] Всі пункти MVP ✅
- [ ] SSE замість polling (optional, performance optimization)
- [ ] LLM3 validator (semantic checks)
- [ ] Smoke tests для unified flow
- [ ] Error handling для всіх edge cases
- [ ] Документація API endpoints
- [ ] Changelog + version bump
