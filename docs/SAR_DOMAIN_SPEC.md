# SAR_DOMAIN_SPEC v0.1

## 1. Domain Mode

The system must support **one mode at a time**:

- `ICS` (Incident Command System)
- `GSB` (Gold–Silver–Bronze)

**Fail-fast:** mixing ICS + GSB roles in one model is invalid.

## 2. Terminology Policy

### Must-use terms (examples)

- Incident Commander
- Operations Section Chief
- Safety Officer
- Liaison Officer
- Incident Command Post (ICP)
- Emergency Operations Center (EOC)

### Synonyms mapping (examples)

- Manager → Incident Commander
- Field Commander → Incident Commander
- Comms Lead → Communications Unit Leader (or Liaison/Logistics depending on your modeling choice)

**Rule:** if a synonym appears, validator issues a warning and suggests canonical term.

## 3. BDD Rules (Structure)

### Required blocks (minimum set)

- CommandAndControl
- CommunicationsSubsystem
- SearchAssets
- RescueAssets
- MedicalTriage

### Command structure (ICS mode)

- Incident Commander must exist
- Operations Section Chief must exist for non-trivial/complex incident

**Fail-fast:** missing CommandAndControl or CommunicationsSubsystem.

## 4. IBD Rules (Internal connectivity)

### Communications redundancy (minimal PACE)

For every **critical actor** (Incident Commander, Ops, Boat Team Leader):

- must have at least **PrimaryComms** and **BackupComms**

**Fail-fast:** only cellular network for critical comms, with no backup.

## 5. SMD Rules (State Machine Diagram)

(SMD here means **State Machine Diagram**, not sequence diagram.)

### Required mission phases (minimum)

- Alert
- Deployment
- Search
- Rescue
- Triage

### Forbidden transitions (examples)

- Alert → Rescue (if target location unknown)
- Rescue → Conclusion/Closeout without Triage
- Rescue → Transport without Triage

**Fail-fast:** missing Triage phase or skipping Triage before Transport/Closeout.

## 6. Asset typing rules (Flood Rescue)

### Type B: Boat Team

- must include MotorizedRescueBoat
- MotorizedRescueBoat must include Motor

**Fail-fast:** Type B without Motor.

### Type D: First Responder (shore/wading)

- prohibited actions include InWaterRescue / LiveBaitSwim

**Fail-fast:** Type D performing in-water rescue.

## 7. Drone safety

If Drone exists:

- loss of ControlLink must trigger ReturnToHome (RTH)

**Fail-fast:** drone present without RTH behavior.

## 8. Severity Policy

- **CRITICAL → fail_fast**
- **WARNING → refine or pass (configurable)**

