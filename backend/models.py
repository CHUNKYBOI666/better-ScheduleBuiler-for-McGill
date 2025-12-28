from sqlalchemy import Column, Integer, String, ARRAY, JSON
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    terms = Column(ARRAY(String), nullable=True)
    instructors = Column(JSONB, nullable=True)
    schedule = Column(JSONB, nullable=True)

