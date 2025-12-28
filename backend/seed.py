import json
import sys
import time
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError
from database import Base
from models import Course
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "")
    
    model_config = SettingsConfigDict(env_file=".env")


def seed_database():
    """Seed the database with courses from the JSON file."""
    settings = Settings()
    
    if not settings.database_url:
        print("ERROR: DATABASE_URL not found in environment variables or .env file")
        sys.exit(1)
    
    # Create engine with better connection pooling and timeout settings
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,  # Verify connections before using them
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=300000"  # 5 minute statement timeout
        }
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
    
    # Read JSON file
    json_path = Path(__file__).parent / "courses-2025-2026.json"
    
    if not json_path.exists():
        print(f"ERROR: File {json_path} not found")
        sys.exit(1)
    
    print(f"Reading {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        courses_data = json.load(f)
    
    print(f"Found {len(courses_data)} courses in JSON file")
    
    # Process and insert courses
    processed_count = 0
    skipped_count = 0
    batch_size = 50  # Smaller batches for more frequent commits
    
    print("Starting to process courses...")
    
    # Process in batches with error recovery
    for batch_start in range(0, len(courses_data), batch_size):
        batch_end = min(batch_start + batch_size, len(courses_data))
        batch = courses_data[batch_start:batch_end]
        
        # Retry logic for connection issues
        max_retries = 3
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            db = SessionLocal()
            try:
                batch_inserted = 0
                
                for course_data in batch:
                    # Combine subject and code to create course_code
                    subject = course_data.get("subject", "")
                    code = course_data.get("code", "")
                    course_code = f"{subject} {code}".strip()
                    
                    if not course_code:
                        skipped_count += 1
                        continue
                    
                    # Prepare course data
                    course_dict = {
                        "course_code": course_code,
                        "title": course_data.get("title", ""),
                        "description": course_data.get("description") or "",
                        "terms": course_data.get("terms", []),
                        "instructors": course_data.get("instructors", []),
                        "schedule": course_data.get("schedule", [])
                    }
                    
                    # Use PostgreSQL's ON CONFLICT for upsert (no need to check existence first)
                    stmt = insert(Course).values(**course_dict)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['course_code'],
                        set_=dict(
                            title=stmt.excluded.title,
                            description=stmt.excluded.description,
                            terms=stmt.excluded.terms,
                            instructors=stmt.excluded.instructors,
                            schedule=stmt.excluded.schedule
                        )
                    )
                    
                    db.execute(stmt)
                    batch_inserted += 1
                
                # Commit the batch
                db.commit()
                processed_count += len(batch)
                success = True
                
                # Progress update
                if processed_count % 500 == 0 or processed_count == len(courses_data):
                    print(f"Processed {processed_count}/{len(courses_data)} courses... ({processed_count * 100 // len(courses_data)}%)")
                
            except (OperationalError, Exception) as e:
                db.rollback()
                retry_count += 1
                
                if retry_count < max_retries:
                    wait_time = retry_count * 2  # Exponential backoff: 2s, 4s, 6s
                    print(f"Connection error at batch {batch_start}-{batch_end}. Retrying in {wait_time}s... (Attempt {retry_count}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    print(f"\nERROR: Failed to process batch {batch_start}-{batch_end} after {max_retries} attempts")
                    print(f"Error: {str(e)}")
                    print(f"\nProgress: {processed_count}/{len(courses_data)} courses processed successfully")
                    print("You can re-run the script - it will update existing records and continue from where it left off.")
                    raise
            finally:
                db.close()
    
    print(f"\n{'='*50}")
    print(f"Seeding completed successfully!")
    print(f"  - Total courses processed: {processed_count}")
    print(f"  - Skipped: {skipped_count}")
    print(f"{'='*50}")


if __name__ == "__main__":
    seed_database()

