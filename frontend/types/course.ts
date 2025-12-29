// Type definitions matching backend CourseResponse schema

export interface Instructor {
  name: string;
  nameNgrams?: string | null;
  term: string;
}

export interface TimeBlock {
  day: string; // "1"-"7" (Sunday-Saturday: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday)
  t1: string; // Start time in minutes from midnight
  t2: string; // End time in minutes from midnight
}

export interface ScheduleBlock {
  campus: string;
  display: string; // e.g., "Lec 001", "Lab 001"
  location: string;
  timeblocks: TimeBlock[];
  crn: string;
}

export interface ScheduleTerm {
  term: string; // e.g., "Fall 2025", "Winter 2026"
  blocks: ScheduleBlock[];
}

export interface Course {
  id: number;
  course_code: string;
  title: string;
  description: string | null;
  terms: string[] | null;
  instructors: Instructor[] | null;
  schedule: ScheduleTerm[] | null;
}

// Frontend calendar format
export interface CourseSlot {
  day: number; // 1-5 (Monday-Friday)
  start: number; // Decimal hours (e.g., 10.5 = 10:30)
  end: number; // Decimal hours
  type?: "lecture" | "lab" | "tutorial"; // Optional type indicator
}

// McGill.courses course information
export interface McGillCourseInfo {
  course_code: string;
  title?: string | null;
  description?: string | null;
  prerequisites?: string | null;
  credits?: number | null;
  url?: string | null;
}

// Grouped schedule types for UI display
export interface TutorialOption {
  display: string; // e.g., "Tut 004"
  crn: string;
  location: string;
  timeblocks: TimeBlock[];
}

export interface LectureGroup {
  lecture: string; // e.g., "Lec 001"
  lectureCrn: string;
  lectureLocation: string;
  lectureTimeblocks: TimeBlock[];
  tutorials: TutorialOption[];
}

export interface GroupedSchedule {
  term: string;
  lectureGroups: LectureGroup[];
}

// Schedule selection type
export interface ScheduleSelection {
  lecture: string; // e.g., "Lec 001"
  tutorial: string; // e.g., "Tut 004"
}

