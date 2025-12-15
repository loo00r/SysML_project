# План імплементації змін з `Current_update.docx` (Flood Rescue / SAR, Validator-in-the-Loop)

## 0) Контекст і ціль

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

## 1) Що потрібно уточнити (до початку коду)

Документ дає приклади SAR-правил, але **не дає повного переліку**. Щоб не “вигадувати домен”, потрібні вхідні артефакти:

1) **Який набір SAR-правил є “строгим і завершеним”** (повний список):
   - обов’язкові підсистеми/актори/канали зв’язку,
   - перелік fallback-механізмів (наприклад Drone_Link ↔ Radio_Backup),
   - перелік “заборонених” станів/переходів,
   - перелік термінів “must-use” (Incident Commander тощо) + синоніми/мапінг.

2) **Які саме діаграми вважаємо цільовими** для цього оновлення:
   - тільки BDD/IBD/SMD (як у бекенді зараз),
   - чи потрібно додати/валідувати інші типи.

3) **Як включати доменність**:
   - завжди SAR (за замовчуванням),
   - чи вибір домену параметром (`domain="sar"|"generic"`),
   - чи декілька доменів у майбутньому (на цьому етапі — не обов’язково).

4) **Політика “fail-fast”**:
   - які помилки є “critical” (зупиняємо ланцюжок),
   - які є “warnings” (дозволяємо продовжити).

5) **Ліміти ітерацій self-refinement**:
   - рекомендовано: `max_iterations=1..2` для кожного кроку (BDD / IBD / SMD), щоб не роздувати час/вартість.

6) **Що відображає фронтенд**:
   - тільки фінальний score + список проблем,
   - чи також проміжні звіти (BDD валідовано, IBD в процесі…).

Результат уточнення: короткий “Domain Spec” (див. Фаза 1).

## 2) “Погуглені” ключові патерни (коротко, для прив’язки до літератури)

З посилань у `Current_update.docx`:

- **Self-Refine (arXiv:2303.17651)**: одна і та сама LLM генерує → дає фідбек → перегенеровує; без додаткового тренування.
- **Chain-of-Verification (arXiv:2309.11495)**: draft → план verification-питань → незалежні відповіді → фінальна відповідь; зменшує hallucinations.
- **ModRE 2024 study (arXiv:2404.06371)**: моделі часто проблемні по completeness/correctness, навіть якщо “стандартність” і “читабельність” ок.

Для нас це означає: валідатор має бути **окремим кроком** і давати структурований фідбек, який можна подати назад у генератор.

## 3) Запропонована цільова архітектура (мінімальна)

### 3.1. Нові модулі бекенду (пропозиція)

1) `backend/app/domain/` (нове)
   - `sar_constraints.md|json` — доменні правила/терміни/шаблони.
   - `domain_injection.py` — збирання “Domain Context” рядка для промптів.

2) `backend/app/validation/` (нове)
   - `schemas.py` — Pydantic моделі звіту (issues, score, category scores).
   - `deterministic.py` — швидкі перевірки без LLM (структура JSON, SAR-фази, наявність fallback, термінологія).
   - `llm_validator.py` — LLM3-перевірка (опціонально/по фічефлагу).
   - `refinement.py` — цикл “validate → refine prompt → regenerate” з лімітом ітерацій.

3) Мінімальні зміни в існуючих пайплайнах:
   - `backend/app/database/rag_router.py` (уніфікований async chain):
     - після BDD: validate (fail-fast) → (optional refine) → тільки тоді IBD/SMD.
     - під час IBD/SMD для кожного блоку: validate → (optional refine) → save payload.
   - `backend/app/diagrams/create_diagram.py` (імедіат-персіст):
     - або (а) валідувати BDD перед записом,
     - або (б) додати “validate only / dry-run” режим.

### 3.2. Контракти даних (мінімально потрібні)

**ValidationReport** (зберігаємо у Redis-пейлоаді, і віддаємо фронту):

- `score_total: int (0..100)`
- `score_by_category: {completeness, correctness, standards, terminology, understandability}`
- `issues: [{code, severity, message, location?}]`
- `recommendation: "pass"|"refine"|"fail_fast"`
- `refinement_iterations_used: int`

Мінімум для першого релізу: `score_total`, `issues`, `recommendation`.

## 4) Детальний покроковий план по фазах

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

### Фаза 2 — Domain Injection Module (мінімальна інжекція в промпти)

Ціль: щоб генератор стабільно “бачив” SAR-обмеження, навіть без LLM-валідатора.

1) Додати `domain_injection.py`, який:
   - приймає `domain="sar"|"generic"`,
   - повертає короткий `domain_context: str` (до ~1–2k символів), без “романів”.

2) Прокинути `domain_context` у:
   - `generate_sysml_diagram(...)` для BDD,
   - `generate_ibd_diagram(...)` для IBD,
   - `generate_state_machine_diagram(...)` для SMD.

3) Додати параметр в API:
   - в `POST /rag/generate-diagram-unified/` і `POST /rag/generate-diagram-with-context/` (optional): `domain`.
   - дефолт: `generic` (якщо бізнес хоче SAR-by-default — змінити після підтвердження).

Acceptance criteria:
- Для однакового input тексту, при `domain="sar"` промпт реально містить SAR-контекст (видно у debug-логах/трасуванні).

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

### Фаза 5 — Self-Refinement loop (обмежений)

Ціль: автоматично виправляти очевидні помилки 1–2 ітераціями.

1) Алгоритм (BDD / IBD / SMD):
   - generate → deterministic validate
   - якщо recommendation = `refine`:
     - сформувати “refinement prompt” (короткий список вимог + issues),
     - regenerate (тільки відповідний артефакт),
     - validate знову
   - hard limit `max_iterations=2` (щоб не зациклити).

2) Для unified chain:
   - BDD мусить пройти мінімальну валідацію першою (fail-fast),
   - IBD/SMD генеруються тільки для валідних кандидатів.

3) Для RAG:
   - refinement prompt додаємо *після* one-shot прикладів, щоб не “перебити” контекст.

Acceptance criteria:
- При штучно зіпсованому першому BDD (missing required module) система робить 1 перегенерацію і виправляє (або чесно завершує з `fail_fast` після ліміту).

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

## 5) Негативні сценарії та “не робимо зараз” (щоб не оверінженірити)

Не робимо в першій ітерації:
- окреме збереження evaluation logs у БД (можна додати пізніше, коли стабілізується формат звіту),
- складні онтології/knowledge graph для SAR (достатньо списків правил + термінів),
- багатодоменність (поки один домен або `generic`/`sar` перемикач),
- повна “CoVe” з багатьма verification питаннями (достатньо deterministic + 1 LLM оцінки).

## 6) Definition of Done (DoD) для релізу

- Unified flow повертає `quality_score` + `validation_report`.
- BDD валідовано “fail-fast” перед запуском IBD/SMD.
- Мінімальний self-refinement працює і не виходить за ліміти.
- SAR domain injection вмикається керовано (параметр/флаг).
- Є тестове покриття для ключових SAR-правил.

