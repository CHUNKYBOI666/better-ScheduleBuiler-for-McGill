"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, X, Calendar, GraduationCap, Moon, Sun, Clock, ChevronDown, MapPin, Users, Loader2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { searchCourses, getCourseByCode, getMcGillCourseInfo } from "@/lib/api"
import { 
  transformScheduleWithSelection, 
  isCourseAvailableInTerm, 
  groupSchedulesByLecture
} from "@/lib/schedule-utils"
import { findNonConflictingSection, checkSectionConflict } from "@/lib/scheduler"
import { Course, CourseSlot, McGillCourseInfo, ScheduleSelection, GroupedSchedule, LectureGroup, TutorialOption, TimeBlock } from "@/types/course"
import { toast } from "sonner"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8 AM to 8 PM

const COURSE_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

// Extended course type with transformed schedule for frontend
interface CourseWithSchedule extends Course {
  transformedSchedule: CourseSlot[]
}

// Helper to format timeblocks for display
function formatTimeblocks(timeblocks: TimeBlock[]): string {
  return timeblocks.map((tb) => {
    const startHr = Math.floor(parseInt(tb.t1) / 60)
    const startMin = parseInt(tb.t1) % 60
    const endHr = Math.floor(parseInt(tb.t2) / 60)
    const endMin = parseInt(tb.t2) % 60
    const dayName = DAYS_SHORT[parseInt(tb.day) - 1] || "?"
    return `${dayName} ${startHr}:${startMin.toString().padStart(2, "0")}-${endHr}:${endMin.toString().padStart(2, "0")}`
  }).join(", ")
}

export default function ScheduleBuilder() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTerm, setSelectedTerm] = useState<"fall" | "winter">("fall")
  const [fallCourses, setFallCourses] = useState<string[]>([]) // Store course codes
  const [winterCourses, setWinterCourses] = useState<string[]>([]) // Store course codes
  const [courseData, setCourseData] = useState<Map<string, CourseWithSchedule>>(new Map()) // Cache full course data
  const [searchResults, setSearchResults] = useState<Course[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set())
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null)
  const [mcgillCourseInfo, setMcGillCourseInfo] = useState<McGillCourseInfo | null>(null)
  // Schedule selection state: Map<courseCode, { lecture, tutorial }>
  const [scheduleSelections, setScheduleSelections] = useState<Map<string, ScheduleSelection>>(new Map())
  // Hover preview state: temporarily shows what calendar would look like
  const [hoveredSchedule, setHoveredSchedule] = useState<{
    courseCode: string
    lecture: string
    tutorial: string
  } | null>(null)
  const [showSetupGradesDialog, setShowSetupGradesDialog] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  
  // localStorage key for schedule selections
  const STORAGE_KEY = "courseScheduleSelections"
  const COURSES_STORAGE_KEY = "selectedCourses"

  const selectedCourses = selectedTerm === "fall" ? fallCourses : winterCourses
  const setSelectedCourses = selectedTerm === "fall" ? setFallCourses : setWinterCourses

  const termFullName = selectedTerm === "fall" ? "Fall 2025" : "Winter 2026"

  // Load schedule selections and courses from localStorage on mount
  useEffect(() => {
    let loadedSelections: Map<string, ScheduleSelection> = new Map()
    let loadedFallCourses: string[] = []
    let loadedWinterCourses: string[] = []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.entries(parsed).forEach(([key, value]) => {
          loadedSelections.set(key, value as ScheduleSelection)
        })
        setScheduleSelections(loadedSelections)
      }
    } catch (error) {
      console.error("Error loading schedule selections from localStorage:", error)
    }

    // Load selected courses
    try {
      const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY)
      if (storedCourses) {
        const parsed = JSON.parse(storedCourses)
        if (parsed.fall) {
          loadedFallCourses = parsed.fall
          setFallCourses(parsed.fall)
        }
        if (parsed.winter) {
          loadedWinterCourses = parsed.winter
          setWinterCourses(parsed.winter)
        }
      }
    } catch (error) {
      console.error("Error loading courses from localStorage:", error)
    }

    // Re-fetch course data for persisted courses
    const allCourses = [...new Set([...loadedFallCourses, ...loadedWinterCourses])]
    if (allCourses.length > 0) {
      const fetchPersistedCourses = async () => {
        for (const courseCode of allCourses) {
          try {
            const course = await getCourseByCode(courseCode)
            const selection = loadedSelections.get(courseCode) || null
            const term = loadedFallCourses.includes(courseCode) ? "Fall 2025" : "Winter 2026"
            const transformedSchedule = transformScheduleWithSelection(course, term as "Fall 2025" | "Winter 2026", selection)
            const courseWithSchedule: CourseWithSchedule = {
              ...course,
              transformedSchedule,
            }
            setCourseData((prev) => {
              const newMap = new Map(prev)
              newMap.set(courseCode, courseWithSchedule)
              return newMap
            })
          } catch (error) {
            console.error(`Error re-fetching course ${courseCode}:`, error)
          }
        }
      }
      fetchPersistedCourses()
    }
  }, [])

  // Save schedule selections to localStorage when they change
  useEffect(() => {
    try {
      const obj: Record<string, ScheduleSelection> = {}
      scheduleSelections.forEach((value, key) => {
        obj[key] = value
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch (error) {
      console.error("Error saving schedule selections to localStorage:", error)
    }
  }, [scheduleSelections])

  // Save selected courses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify({
        fall: fallCourses,
        winter: winterCourses
      }))
    } catch (error) {
      console.error("Error saving courses to localStorage:", error)
    }
  }, [fallCourses, winterCourses])

  // Helper to get the effective schedule selection (including hover preview)
  const getEffectiveSelection = useCallback((courseCode: string): ScheduleSelection | null => {
    // If hovering over a schedule for this course, use that
    if (hoveredSchedule && hoveredSchedule.courseCode === courseCode) {
      return {
        lecture: hoveredSchedule.lecture,
        tutorial: hoveredSchedule.tutorial,
      }
    }
    // Otherwise use the saved selection
    return scheduleSelections.get(courseCode) || null
  }, [hoveredSchedule, scheduleSelections])

  // Update transformed schedules when term or selections change
  useEffect(() => {
    setCourseData((prev) => {
      const newMap = new Map<string, CourseWithSchedule>()
      prev.forEach((course, code) => {
        const selection = getEffectiveSelection(code)
        const transformedSchedule = transformScheduleWithSelection(course, termFullName as "Fall 2025" | "Winter 2026", selection)
        newMap.set(code, { ...course, transformedSchedule })
      })
      return newMap
    })
  }, [termFullName, scheduleSelections, hoveredSchedule, getEffectiveSelection])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchCourses(searchQuery, 10)
        // Filter by term availability
        const filteredResults = results.filter((course) =>
          isCourseAvailableInTerm(course, termFullName as "Fall 2025" | "Winter 2026")
        )
        setSearchResults(filteredResults)
      } catch (error) {
        console.error("Search error:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, termFullName])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const addCourse = async (course: Course) => {
    const courseCode = course.course_code
    if (selectedCourses.includes(courseCode)) {
      return
    }

    // Check if we already have the full course data
    let fullCourse: Course
    if (!courseData.has(courseCode)) {
      setLoadingCourses((prev) => new Set(prev).add(courseCode))
      try {
        fullCourse = await getCourseByCode(courseCode)
      } catch (error) {
        console.error("Error fetching course details:", error)
        toast.error("Failed to fetch course details")
        setLoadingCourses((prev) => {
          const newSet = new Set(prev)
          newSet.delete(courseCode)
          return newSet
        })
        return
      } finally {
        setLoadingCourses((prev) => {
          const newSet = new Set(prev)
          newSet.delete(courseCode)
          return newSet
        })
      }
    } else {
      fullCourse = courseData.get(courseCode)!
    }

    // Get all existing course slots for conflict detection
    const existingSlots: CourseSlot[] = []
    getSelectedCoursesData().forEach((selectedCourse) => {
      existingSlots.push(...selectedCourse.transformedSchedule)
    })

    // Use Smart Add: Find non-conflicting section
    const smartAddResult = findNonConflictingSection(fullCourse, termFullName as "Fall 2025" | "Winter 2026", existingSlots)

    if (!smartAddResult.success) {
      // Show error toast
      toast.error(smartAddResult.message || "Schedule Conflict: No available sections fit your current schedule.")
      return
    }

    // Success! Add the course with the smart selection
    const selection = smartAddResult.selection!
    const transformedSchedule = transformScheduleWithSelection(fullCourse, termFullName as "Fall 2025" | "Winter 2026", selection)
    const courseWithSchedule: CourseWithSchedule = {
      ...fullCourse,
      transformedSchedule,
    }

    setCourseData((prev) => {
      const newMap = new Map(prev)
      newMap.set(courseCode, courseWithSchedule)
      return newMap
    })

    // Set the smart selection
    setScheduleSelections((prev) => {
      const newMap = new Map(prev)
      newMap.set(courseCode, selection)
      return newMap
    })

    // Add to selected courses
    setSelectedCourses([...selectedCourses, courseCode])
    setSearchQuery("")
    setShowDropdown(false)

    // Show success toast with section info
    const sectionInfo = selection.tutorial 
      ? `${selection.lecture} + ${selection.tutorial}` 
      : selection.lecture
    toast.success(`Added ${courseCode}`, {
      description: `Selected: ${sectionInfo}`
    })
  }

  // Handle schedule selection (Lecture + Tutorial)
  const handleScheduleSelect = (courseCode: string, lecture: string, tutorial: string) => {
    setScheduleSelections((prev) => {
      const newMap = new Map(prev)
      newMap.set(courseCode, { lecture, tutorial })
      return newMap
    })
  }

  // Handle schedule hover (for preview)
  const handleScheduleHover = (courseCode: string, lecture: string, tutorial: string) => {
    setHoveredSchedule({ courseCode, lecture, tutorial })
  }

  // Handle schedule hover end
  const handleScheduleHoverEnd = () => {
    setHoveredSchedule(null)
  }

  const removeCourse = (courseCode: string) => {
    setSelectedCourses(selectedCourses.filter((code) => code !== courseCode))
    // Also remove the schedule selection
    setScheduleSelections((prev) => {
      const newMap = new Map(prev)
      newMap.delete(courseCode)
      return newMap
    })
  }

  const getSelectedCoursesData = (): CourseWithSchedule[] => {
    return selectedCourses
      .map((code) => courseData.get(code))
      .filter((course): course is CourseWithSchedule => course !== undefined)
  }

  // Get instructor name for display
  const getInstructorName = (course: Course): string => {
    if (!course.instructors || course.instructors.length === 0) {
      return "TBA"
    }
    const termInstructor = course.instructors.find((inst) => inst.term === termFullName)
    return termInstructor?.name || course.instructors[0]?.name || "TBA"
  }

  // Handle course click to show modal
  const handleCourseClick = async (courseCode: string) => {
    setSelectedCourseCode(courseCode)
    setMcGillCourseInfo(null)

    // Try to get additional info from mcgill.courses
    try {
      const info = await getMcGillCourseInfo(courseCode)
      setMcGillCourseInfo(info)
    } catch (error) {
      console.log("Could not fetch additional info from mcgill.courses:", error)
    }
  }

  // Close modal
  const handleCloseModal = () => {
    setSelectedCourseCode(null)
    setMcGillCourseInfo(null)
    setHoveredSchedule(null)
  }

  // Handle setup grades
  const handleSetupGrades = () => {
    setShowSetupGradesDialog(true)
  }

  // Confirm setup grades
  const confirmSetupGrades = () => {
    try {
      const coursesToTransfer = getSelectedCoursesData().map((course) => ({
        id: course.id,
        course_code: course.course_code,
        title: course.title,
        term: selectedTerm,
      }))

      if (coursesToTransfer.length === 0) {
        toast.error("No courses to transfer", {
          description: "Add courses to your calendar first",
        })
        setShowSetupGradesDialog(false)
        return
      }

      const storageKey = `gradesSetup_${selectedTerm}`
      localStorage.setItem(storageKey, JSON.stringify(coursesToTransfer))

      toast.success(`${coursesToTransfer.length} course${coursesToTransfer.length > 1 ? "s" : ""} transferred`, {
        description: `Navigate to Grades to set up your ${selectedTerm} assessments`,
      })

      setShowSetupGradesDialog(false)
      router.push("/grades")
    } catch (error) {
      console.error("Error transferring courses:", error)
      toast.error("Failed to transfer courses")
      setShowSetupGradesDialog(false)
    }
  }

  // Get selected course data for modal
  const selectedCourse = selectedCourseCode ? courseData.get(selectedCourseCode) : null
  const groupedSchedule = selectedCourse ? groupSchedulesByLecture(selectedCourse, termFullName as "Fall 2025" | "Winter 2026") : null
  const currentSelection = selectedCourseCode ? scheduleSelections.get(selectedCourseCode) : null

  // Get existing slots from OTHER courses for conflict detection
  const existingSlots: CourseSlot[] = []
  if (selectedCourse) {
    getSelectedCoursesData().forEach((course) => {
      if (course.course_code !== selectedCourse.course_code) {
        existingSlots.push(...course.transformedSchedule)
      }
    })
  }

  // Build sections list for the modal
  const sections: Array<{
    lecture: string
    tutorial: string | null
    lectureLocation: string
    tutorialLocation: string | null
    lectureTimeblocks: TimeBlock[]
    tutorialTimeblocks: TimeBlock[]
    isSelected: boolean
    isHovered: boolean
    hasConflict: boolean
  }> = []

  if (groupedSchedule && selectedCourse) {
    for (const lectureGroup of groupedSchedule.lectureGroups) {
      if (lectureGroup.tutorials.length === 0) {
        const hasConflict = checkSectionConflict(
          selectedCourse,
          termFullName as "Fall 2025" | "Winter 2026",
          lectureGroup.lecture,
          "",
          existingSlots
        )
        sections.push({
          lecture: lectureGroup.lecture,
          tutorial: null,
          lectureLocation: lectureGroup.lectureLocation,
          tutorialLocation: null,
          lectureTimeblocks: lectureGroup.lectureTimeblocks,
          tutorialTimeblocks: [],
          isSelected: currentSelection?.lecture === lectureGroup.lecture && !currentSelection.tutorial,
          isHovered: hoveredSchedule?.lecture === lectureGroup.lecture && !hoveredSchedule.tutorial,
          hasConflict,
        })
      } else {
        for (const tutorial of lectureGroup.tutorials) {
          const hasConflict = checkSectionConflict(
            selectedCourse,
            termFullName as "Fall 2025" | "Winter 2026",
            lectureGroup.lecture,
            tutorial.display,
            existingSlots
          )
          sections.push({
            lecture: lectureGroup.lecture,
            tutorial: tutorial.display,
            lectureLocation: lectureGroup.lectureLocation,
            tutorialLocation: tutorial.location,
            lectureTimeblocks: lectureGroup.lectureTimeblocks,
            tutorialTimeblocks: tutorial.timeblocks,
            isSelected:
              currentSelection?.lecture === lectureGroup.lecture &&
              currentSelection?.tutorial === tutorial.display,
            isHovered:
              hoveredSchedule?.lecture === lectureGroup.lecture &&
              hoveredSchedule?.tutorial === tutorial.display,
            hasConflict,
          })
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="px-8 py-5">
          <div className="flex items-center gap-6">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Schedule Builder</h1>
              </div>
            </div>

            {/* Term selector dropdown */}
            <div className="relative">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value as "fall" | "winter")}
                className="h-11 pl-4 pr-10 bg-card/50 border border-border/50 rounded-xl text-sm font-medium text-foreground appearance-none cursor-pointer hover:border-primary/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="fall">Fall 2025</option>
                <option value="winter">Winter 2026</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-xl relative" ref={searchRef}>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <Input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-11 h-11 bg-card/50 border-border/50 focus:border-primary/50 focus:bg-card transition-all duration-200 rounded-xl"
                />
              </div>
              {showDropdown && (isSearching || searchResults.length > 0 || searchQuery.trim()) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/20 max-h-[400px] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                    </div>
                  ) : searchResults.length === 0 && searchQuery.trim() ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-sm text-muted-foreground">No courses found for "{searchQuery}"</span>
                    </div>
                  ) : (
                  <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
                      {searchResults.map((course) => {
                        const isAlreadyAdded = selectedCourses.includes(course.course_code)
                        const isLoading = loadingCourses.has(course.course_code)
                      return (
                        <button
                          key={course.id}
                            onClick={() => !isLoading && addCourse(course)}
                            disabled={isAlreadyAdded || isLoading}
                          className={`w-full text-left px-4 py-3.5 transition-all duration-200 border-b border-border/30 last:border-b-0 ${
                              isAlreadyAdded || isLoading
                              ? "opacity-60 cursor-not-allowed bg-muted/20"
                              : "cursor-pointer hover:bg-accent/60 active:scale-[0.99]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-foreground">{course.course_code}</div>
                              <div className="text-xs text-foreground/80 mt-1 line-clamp-1">{course.title}</div>
                                <div className="text-xs text-muted-foreground mt-1.5">{getInstructorName(course)}</div>
                            </div>
                              {isLoading && (
                                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                              )}
                              {isAlreadyAdded && !isLoading && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg shrink-0">
                                <span className="text-xs text-primary font-medium">Added</span>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-110 active:scale-95 border border-border/40 ml-auto"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar - 75% width */}
        <div className="w-[75%] flex flex-col border-r border-border/50">
          <div className="flex-1 overflow-auto p-6">
            {selectedCourses.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Search for courses above</h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    Search and add courses to start building your {selectedTerm} schedule
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-px bg-border/30 rounded-2xl overflow-hidden border border-border/50 shadow-xl shadow-black/5">
                  {/* Header Row */}
                  <div className="bg-card/50 backdrop-blur-sm"></div>
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="bg-card/50 backdrop-blur-sm p-4 text-center font-semibold text-sm text-foreground tracking-tight"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Time Slots */}
                  {HOURS.map((hour) => (
                    <div key={`row-${hour}`} className="contents">
                      <div
                        className="bg-background/50 backdrop-blur-sm p-4 text-right text-xs text-muted-foreground font-medium border-r border-border/30"
                      >
                        {hour}:00
                      </div>
                      {DAYS.map((_, dayIndex) => (
                        <div
                          key={`${hour}-${dayIndex}`}
                          className="bg-background/30 backdrop-blur-sm relative min-h-[70px] hover:bg-accent/5 transition-colors duration-200"
                        >
                          {getSelectedCoursesData().map((course, courseIdx) => {
                            const isPreview = hoveredSchedule?.courseCode === course.course_code
                            
                            return course.transformedSchedule
                              .filter((slot) => slot.day === dayIndex + 1)
                              .filter((slot) => {
                                const slotStart = slot.start
                                const slotEnd = slot.end
                                return hour >= Math.floor(slotStart) && hour < Math.ceil(slotEnd)
                              })
                              .map((slot) => {
                                if (hour === Math.floor(slot.start)) {
                                  const duration = slot.end - slot.start
                                  const colorClass = COURSE_COLORS[courseIdx % COURSE_COLORS.length]
                                  const startMinutes = Math.round((slot.start % 1) * 60)
                                  const endMinutes = Math.round((slot.end % 1) * 60)
                                  return (
                                    <div
                                      key={`${course.id}-${slot.day}-${slot.start}`}
                                      className={`absolute inset-x-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group/course border-2 ${
                                        isPreview
                                          ? "border-primary/60 ring-2 ring-primary/30"
                                          : "border-border/60 hover:border-primary/40"
                                      }`}
                                      style={{
                                        top: `${(slot.start % 1) * 100}%`,
                                        height: `${duration * 70}px`,
                                        opacity: isPreview ? 0.7 : 1,
                                      }}
                                      onClick={() => handleCourseClick(course.course_code)}
                                    >
                                      <div className={`absolute inset-0 ${colorClass} opacity-20`} />
                                      <div className="relative h-full bg-card p-3 flex flex-col">
                                        <div
                                          className={`absolute top-0 left-0 right-0 h-1 ${colorClass} group-hover/course:h-1.5 transition-all duration-300`}
                                        />
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
                                          <span className="font-bold text-sm text-foreground tracking-tight">
                                            {course.course_code}
                                          </span>
                                          <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colorClass} bg-opacity-20`}
                                          >
                                            {slot.type || "Lecture"}
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{course.title}</div>
                                        {duration >= 2 && (
                                          <div className="mt-auto pt-2">
                                            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                              <Clock className="w-3 h-3" />
                                              <span>
                                                {Math.floor(slot.start)}:{startMinutes.toString().padStart(2, "0")} - {Math.floor(slot.end)}:{endMinutes.toString().padStart(2, "0")}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              })
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - 25% */}
        <div className="w-[25%] flex flex-col bg-card/20 backdrop-blur-sm">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-base text-foreground">Your Courses</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCourses.length} course{selectedCourses.length !== 1 ? "s" : ""} added
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {selectedCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-sm text-foreground mb-1">No courses yet</h3>
                <p className="text-xs text-muted-foreground max-w-[160px] mx-auto leading-relaxed">
                  Search above to add courses
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {getSelectedCoursesData().map((course, idx) => {
                  const colorClass = COURSE_COLORS[idx % COURSE_COLORS.length]
                  return (
                    <Card
                      key={course.course_code}
                      className="p-3 glass border-border/40 hover:border-border/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group cursor-pointer"
                      onClick={() => handleCourseClick(course.course_code)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div
                            className={`w-0.5 h-12 rounded-full ${colorClass} shadow-md ${colorClass.replace("bg-", "shadow-")}/50`}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground tracking-tight">
                              {course.course_code}
                            </div>
                            <div className="text-xs text-foreground/80 line-clamp-1 mt-0.5">{course.title}</div>
                            <div className="text-[11px] text-muted-foreground mt-1">{getInstructorName(course)}</div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive rounded-lg h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCourse(course.course_code)
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-xl">
              <Button
              onClick={handleSetupGrades}
                className="w-full h-10 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 rounded-xl group text-sm"
                variant="outline"
              >
                <GraduationCap className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-medium">Setup Grades</span>
              </Button>
          </div>
        </div>
      </div>

      {/* Center Modal - Course Info */}
      {selectedCourse && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div
            className="absolute top-[calc(50vh-300px)] left-[37.5%] -translate-x-1/2 w-[550px] h-[600px] glass-strong rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 flex flex-col"
            style={{ opacity: hoveredSchedule ? 0.3 : 1, transition: "opacity 0.2s" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">{selectedCourse.course_code}</h2>
                <p className="text-sm text-muted-foreground mt-2">{mcgillCourseInfo?.credits || 3} credits</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <h3 className="text-xl font-semibold text-foreground mb-3">{selectedCourse.title}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed mb-6">
                {selectedCourse.description || mcgillCourseInfo?.description || "Course description not available."}
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Instructor</div>
                      <div className="text-foreground font-medium">{getInstructorName(selectedCourse)}</div>
                    </div>
                  </div>
                </div>

                {mcgillCourseInfo?.prerequisites && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                    <div className="text-xs text-muted-foreground mb-2">Prerequisites</div>
                  <div className="text-sm text-foreground/80 leading-relaxed">
                      {mcgillCourseInfo.prerequisites}
                  </div>
                  </div>
                )}

                <div className="pt-2">
                  <a
                    href={`https://mcgill.courses/course/${selectedCourse.course_code.toLowerCase().replace(/\s+/g, '-')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span>View more on mcgill.courses</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Sections Panel */}
      {selectedCourse && (
        <div
          className="fixed top-[calc(50vh-300px)] right-0 w-[25%] h-[600px] glass-strong backdrop-blur-xl border-l border-border/50 rounded-l-2xl shadow-2xl z-50 animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-border/30 bg-card/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">Available Sections</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{selectedCourse.course_code}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {sections.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No sections available for this term.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sections.map((section, idx) => (
                  <div
                    key={`${section.lecture}-${section.tutorial || 'no-tut'}-${idx}`}
                    className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                      section.hasConflict
                        ? "bg-destructive/10 border-2 border-destructive/40 opacity-75 cursor-not-allowed"
                        : section.isSelected
                        ? "glass border-2 border-primary/50 shadow-lg shadow-primary/10"
                        : section.isHovered
                        ? "glass border-2 border-primary/30"
                        : "glass border-border/40 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                    }`}
                    onMouseEnter={() => !section.hasConflict && handleScheduleHover(selectedCourse.course_code, section.lecture, section.tutorial || "")}
                    onMouseLeave={handleScheduleHoverEnd}
                    onClick={() => !section.hasConflict && handleScheduleSelect(selectedCourse.course_code, section.lecture, section.tutorial || "")}
                >
                  <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${section.hasConflict ? "text-destructive" : "text-foreground"}`}>
                          {section.lecture}
                          {section.tutorial && ` + ${section.tutorial}`}
                        </span>
                        {section.hasConflict && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/20 border border-destructive/30 rounded-lg">
                            <AlertCircle className="w-3 h-3 text-destructive" />
                            <span className="text-[10px] font-semibold text-destructive">Conflict</span>
                          </div>
                        )}
                        {section.isSelected && !section.hasConflict && (
                          <div className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded-lg">
                            <span className="text-[10px] font-semibold text-primary">Selected</span>
                          </div>
                        )}
                    </div>
                    <div className="p-1 rounded-lg bg-muted/30">
                      <Users className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground/80 text-[11px]">{section.lectureLocation}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/30">
                    <div className="text-[10px] text-muted-foreground font-medium mb-1.5">Schedule:</div>
                    <div className="space-y-1">
                        {section.lectureTimeblocks.length > 0 && (
                          <div className="text-[10px] text-foreground/70">
                            <span className="text-primary font-semibold">Lec: </span>
                            {formatTimeblocks(section.lectureTimeblocks)}
                        </div>
                        )}
                        {section.tutorialTimeblocks.length > 0 && (
                          <div className="text-[10px] text-foreground/70">
                            <span className="text-chart-2 font-semibold">Tut: </span>
                            {formatTimeblocks(section.tutorialTimeblocks)}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Grades Confirmation Dialog */}
      <Dialog open={showSetupGradesDialog} onOpenChange={setShowSetupGradesDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">Setup Grades</DialogTitle>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              This will integrate the courses from your <span className="font-semibold text-foreground capitalize">{selectedTerm}</span> calendar into the Grades page.
              {selectedCourses.length === 0 ? (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    You don&apos;t have any courses in your {selectedTerm} calendar yet. Add courses before setting up grades.
                  </span>
                </div>
              ) : (
                <>
                  <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/40">
                    <p className="text-sm font-semibold text-foreground mb-2">
                      {selectedCourses.length} course{selectedCourses.length > 1 ? "s" : ""} will be transferred:
                    </p>
                    <ul className="space-y-1.5">
                      {getSelectedCoursesData().slice(0, 5).map((course) => (
                        <li key={course.id} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          <span className="font-medium text-foreground">{course.course_code}</span>
                          <span>-</span>
                          <span className="line-clamp-1">{course.title}</span>
                        </li>
                      ))}
                      {selectedCourses.length > 5 && (
                        <li className="text-sm text-muted-foreground italic">
                          ... and {selectedCourses.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      Existing grade data will be preserved. Only new courses will be added.
                    </span>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSetupGradesDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSetupGrades}
              disabled={selectedCourses.length === 0}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              Continue to Grades
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
