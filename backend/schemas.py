from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CourseBase(BaseModel):
    course_code: str
    title: str
    description: Optional[str] = None
    terms: Optional[List[str]] = None
    instructors: Optional[List[Dict[str, Any]]] = None
    schedule: Optional[List[Dict[str, Any]]] = None


class CourseCreate(CourseBase):
    pass


class CourseResponse(CourseBase):
    id: int

    class Config:
        from_attributes = True


class McGillCourseInfo(BaseModel):
    course_code: str
    title: Optional[str] = None
    description: Optional[str] = None
    prerequisites: Optional[str] = None
    credits: Optional[float] = None
    url: Optional[str] = None

