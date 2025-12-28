# McGill Course API

A FastAPI backend for accessing McGill course information stored in a Supabase PostgreSQL database.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure database:**
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your Supabase PostgreSQL connection string
   - Format: `postgresql://postgres:your_password@db.your_project_ref.supabase.co:5432/postgres`

3. **Seed the database:**
   ```bash
   python seed.py
   ```
   This will create the tables and populate them with data from `courses-2025-2026.json`.

4. **Run the API:**
   ```bash
   uvicorn main:app --reload
   ```
   Or:
   ```bash
   python main.py
   ```

## API Endpoints

- `GET /` - Welcome message
- `GET /courses` - Get all courses (with pagination)
  - Query parameters:
    - `skip`: Number of records to skip (default: 0)
    - `limit`: Maximum number of records to return (default: 100, max: 1000)
- `GET /courses/{course_code}` - Get a single course by code (e.g., "COMP 202")

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

- `main.py` - FastAPI application with endpoints
- `database.py` - Database connection and session management
- `models.py` - SQLAlchemy models
- `schemas.py` - Pydantic schemas for request/response validation
- `seed.py` - Script to populate the database from JSON
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variables template




