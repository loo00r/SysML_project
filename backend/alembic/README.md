# Alembic Database Migrations

This directory contains database migration scripts for the SysML project.

## Usage

### Create a new migration
```
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```
alembic upgrade head
```

### Downgrade migrations
```
alembic downgrade -1  # Go back one revision
alembic downgrade base  # Go back to base (revert all migrations)
```

### Check current database version
```
alembic current
```

### Migration history
```
alembic history
```
