from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Course
from schemas import CourseResponse
from sqlalchemy import func

app = FastAPI(
    title="McGill Course API",
    description="API for accessing McGill course information",
    version="1.0.0"
)


@app.get("/")
async def root():
    return {"message": "Welcome to the McGill Course API"}


@app.get("/courses", response_model=List[CourseResponse])
async def get_courses(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db)
):
    """
    Get all courses with optional pagination.
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (1-1000)
    """
    courses = db.query(Course).offset(skip).limit(limit).all()
    return courses


@app.get("/courses/{course_code}", response_model=CourseResponse)
async def get_course_by_code(
    course_code: str,
    db: Session = Depends(get_db)
):
    """
    Get a single course by its course code (e.g., "COMP 202").
    
    - **course_code**: The course code in format "SUBJECT CODE" (e.g., "COMP 202")
    """
    course = db.query(Course).filter(func.lower(Course.course_code) == course_code.lower()).first()
    
    if not course:
        raise HTTPException(
            status_code=404,
            detail=f"Course with code '{course_code}' not found"
        )
    
    return course


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

