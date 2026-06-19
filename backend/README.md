# BI Backend (Django + DRF)

## Local (Windows) without Docker

- Create venv + install:

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

- Run migrations + seed:

```powershell
.\.venv\Scripts\python server\manage.py migrate
.\.venv\Scripts\python server\manage.py seed
```

- Start server:

```powershell
.\.venv\Scripts\python server\manage.py runserver 0.0.0.0:8000
```

## Docker (Postgres + Redis)

```bash
docker compose up --build
```

Then run:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed
```

## Key endpoints

- `POST /api/external-login/` (returns `sessionId` + sets `access_token` cookie)
- `GET/POST/DELETE /api/report-groups/`
- `GET/POST/PUT /api/reports/`
- `POST /api/user`

BI primitives (v1):
- `GET/POST /api/v1/connections/` + `POST /api/v1/connections/<public_id>/test/`
- `POST /api/v1/sql/execute`
- `GET /api/v1/sql/history`
- `GET /api/v1/query-runs/<id>/export.csv`
- `GET/POST /api/v1/datasets/`, `/api/v1/charts/`, `/api/v1/dashboards/`

## API docs

- Swagger UI: `GET /api/docs/`
- OpenAPI schema: `GET /api/schema/`
