from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Course
from schemas import CourseResponse, McGillCourseInfo
from sqlalchemy import func, or_
import httpx
from bs4 import BeautifulSoup
import re
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="McGill Course API",
    description="API for accessing McGill course information",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004"],  # Next.js ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/courses/search", response_model=List[CourseResponse])
async def search_courses(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Search for courses by course code or title.
    
    - **q**: Search query (searches in course_code and title)
    - **limit**: Maximum number of results to return (1-50, default: 10)
    """
    search_term = f"%{q.lower()}%"
    courses = db.query(Course).filter(
        or_(
            func.lower(Course.course_code).like(search_term),
            func.lower(Course.title).like(search_term)
        )
    ).limit(limit).all()
    
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


@app.get("/courses/mcgill-info/{course_code}", response_model=McGillCourseInfo)
async def get_mcgill_course_info(course_code: str):
    """
    Get course information from mcgill.courses website.
    
    - **course_code**: The course code in format "SUBJECT CODE" (e.g., "MATH 240")
    """
    # Convert course code format: "MATH 240" -> "math-240"
    course_code_lower = course_code.lower().replace(" ", "-")
    url = f"https://mcgill.courses/course/{course_code_lower}"
    
    logger.info(f"Fetching course info from mcgill.courses for: {course_code} (URL: {url})")
    
    try:
        # Add user-agent header to avoid being blocked
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            logger.info(f"Response status: {response.status_code} for {url}")
            
            response.raise_for_status()
            
            # Check if response is empty
            if not response.text or len(response.text.strip()) == 0:
                logger.warning(f"Empty response from {url}")
                raise HTTPException(
                    status_code=500,
                    detail="Received empty response from mcgill.courses"
                )
            
            # Try lxml parser first, fallback to html.parser
            try:
                soup = BeautifulSoup(response.text, "lxml")
                logger.debug("Using lxml parser")
            except Exception as parse_error:
                logger.warning(f"lxml parser failed, falling back to html.parser: {str(parse_error)}")
                try:
                    soup = BeautifulSoup(response.text, "html.parser")
                    logger.debug("Using html.parser")
                except Exception as fallback_error:
                    logger.error(f"Both parsers failed. html.parser error: {str(fallback_error)}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to parse HTML response: {str(fallback_error)}"
                    )
            
            if soup is None:
                logger.error("BeautifulSoup returned None")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to parse HTML: BeautifulSoup returned None"
                )
            
            # Initialize result
            result = McGillCourseInfo(course_code=course_code, url=url)
            
            # Extract title (usually in h1 or similar)
            try:
                title_elem = soup.find("h1") or soup.find("title")
                if title_elem:
                    title_text = title_elem.get_text(strip=True)
                    if title_text:
                        result.title = title_text
                        # Clean up title if it contains course code
                        if course_code.upper() in result.title:
                            result.title = result.title.replace(course_code.upper(), "").strip()
            except Exception as e:
                logger.warning(f"Error extracting title: {str(e)}")
            
            # Extract description
            try:
                # Look for common description selectors
                desc_selectors = [
                    'div[class*="description"]',
                    'p[class*="description"]',
                    'div[class*="course-description"]',
                    'section[class*="description"]',
                ]
                for selector in desc_selectors:
                    desc_elem = soup.select_one(selector)
                    if desc_elem:
                        desc_text = desc_elem.get_text(strip=True)
                        if desc_text and len(desc_text) > 20:  # Minimum length check
                            result.description = desc_text
                            break
                
                # If no description found, try to find any paragraph with substantial text
                if not result.description:
                    paragraphs = soup.find_all("p")
                    for p in paragraphs:
                        if p:
                            text = p.get_text(strip=True)
                            if text and len(text) > 100:  # Substantial description
                                result.description = text
                                break
            except Exception as e:
                logger.warning(f"Error extracting description: {str(e)}")
            
            # Extract prerequisites
            try:
                prereq_keywords = ["prerequisite", "prereq", "required"]
                for keyword in prereq_keywords:
                    # Look for elements containing prerequisite text
                    elements = soup.find_all(string=re.compile(keyword, re.I))
                    for elem in elements:
                        if elem and elem.parent:
                            parent = elem.parent
                            text = parent.get_text(strip=True)
                            if text and keyword.lower() in text.lower():
                                # Extract the prerequisite information
                                result.prerequisites = text
                                break
                    if result.prerequisites:
                        break
            except Exception as e:
                logger.warning(f"Error extracting prerequisites: {str(e)}")
            
            # Extract credits
            try:
                # Look for credit information (usually "3 credits" or similar)
                credit_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*credit', re.I)
                text_content = soup.get_text()
                if text_content:
                    credit_match = credit_pattern.search(text_content)
                    if credit_match:
                        try:
                            result.credits = float(credit_match.group(1))
                        except (ValueError, IndexError) as e:
                            logger.warning(f"Error parsing credits: {str(e)}")
            except Exception as e:
                logger.warning(f"Error extracting credits: {str(e)}")
            
            logger.info(f"Successfully extracted info for {course_code}")
            return result
            
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching {url}: {e.response.status_code} - {str(e)}", exc_info=True)
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Course '{course_code}' not found on mcgill.courses"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching course info: HTTP {e.response.status_code}"
        )
    except httpx.TimeoutException as e:
        logger.error(f"Timeout fetching {url}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=504,
            detail="Request to mcgill.courses timed out"
        )
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error scraping {url}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error scraping mcgill.courses: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

