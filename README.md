# ScheduleBuilder for McGill

Course information and scheduling system for McGill University using FastAPI and Next.js.

## Setup

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` (or another port if 3000 is taken) and connects to the Python backend on `http://localhost:8000`.
