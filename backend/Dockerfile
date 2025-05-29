FROM python:3.12.7

WORKDIR /sysml-backend

# Install PostgreSQL client for psql commands
RUN apt-get update && apt-get install -y postgresql-client && apt-get clean

RUN curl -sSL https://install.python-poetry.org | python3 -

ENV PATH="/root/.local/bin:$PATH"

RUN poetry config virtualenvs.create false

COPY pyproject.toml poetry.lock* /sysml-backend/

RUN poetry install --no-interaction --no-root

COPY app /sysml-backend/app


COPY launch.sh /sysml-backend/launch.sh

CMD ["sh", "/sysml-backend/launch.sh"]