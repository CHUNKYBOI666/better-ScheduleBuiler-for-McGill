"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X, Calendar, GraduationCap, Sparkles, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"

// Mock course data with realistic examples
const COURSES = [
  {
    id: 1,
    course_code: "COMP 202",
    title: "Foundations of Programming",
    instructor: "Prof. Sarah Chen",
    schedule: [
      { day: 1, start: 10, end: 11.5 }, // Monday 10:00-11:30
      { day: 3, start: 10, end: 11.5 }, // Wednesday 10:00-11:30
    ],
  },
  {
    id: 2,
    course_code: "MATH 133",
    title: "Linear Algebra and Geometry",
    instructor: "Prof. Michael Ross",
    schedule: [
      { day: 2, start: 13, end: 14.5 }, // Tuesday 13:00-14:30
      { day: 4, start: 13, end: 14.5 }, // Thursday 13:00-14:30
    ],
  },
  {
    id: 3,
    course_code: "PHYS 101",
    title: "Introductory Physics I",
    instructor: "Dr. Jennifer Park",
    schedule: [
      { day: 1, start: 14, end: 15.5 }, // Monday 14:00-15:30
      { day: 3, start: 14, end: 15.5 }, // Wednesday 14:00-15:30
      { day: 5, start: 9, end: 10 }, // Friday 9:00-10:00 (lab)
    ],
  },
  {
    id: 4,
    course_code: "CHEM 110",
    title: "General Chemistry",
    instructor: "Prof. David Kumar",
    schedule: [
      { day: 2, start: 10, end: 11.5 }, // Tuesday 10:00-11:30
      { day: 4, start: 10, end: 11.5 }, // Thursday 10:00-11:30
    ],
  },
  {
    id: 5,
    course_code: "ENGL 110",
    title: "Academic Writing",
    instructor: "Dr. Emily Watson",
    schedule: [
      { day: 1, start: 16, end: 17.5 }, // Monday 16:00-17:30
    ],
  },
  {
    id: 6,
    course_code: "ECON 208",
    title: "Microeconomic Analysis",
    instructor: "Prof. Robert Li",
    schedule: [
      { day: 2, start: 15, end: 16.5 }, // Tuesday 15:00-16:30
      { day: 4, start: 15, end: 16.5 }, // Thursday 15:00-16:30
    ],
  },
  {
    id: 7,
    course_code: "BIOL 111",
    title: "Principles of Biology",
    instructor: "Dr. Amanda Martinez",
    schedule: [
      { day: 3, start: 12, end: 13.5 }, // Wednesday 12:00-13:30
      { day: 5, start: 12, end: 13.5 }, // Friday 12:00-13:30
    ],
  },
  {
    id: 8,
    course_code: "PSYC 100",
    title: "Introduction to Psychology",
    instructor: "Prof. James Taylor",
    schedule: [
      { day: 1, start: 12, end: 13.5 }, // Monday 12:00-13:30
      { day: 3, start: 16, end: 17.5 }, // Wednesday 16:00-17:30
    ],
  },
]

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8 AM to 8 PM

const COURSE_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

export default function ScheduleBuilder() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTerm, setSelectedTerm] = useState<"fall" | "winter">("fall")
  const [fallCourses, setFallCourses] = useState<number[]>([])
  const [winterCourses, setWinterCourses] = useState<number[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  const selectedCourses = selectedTerm === "fall" ? fallCourses : winterCourses
  const setSelectedCourses = selectedTerm === "fall" ? setFallCourses : setWinterCourses

  const searchResults = searchQuery.trim()
    ? COURSES.filter(
        (course) =>
          course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ).slice(0, 8) // Limit to 8 results
    : []

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const addCourse = (courseId: number) => {
    if (!selectedCourses.includes(courseId)) {
      setSelectedCourses([...selectedCourses, courseId])
    }
    setSearchQuery("")
    setShowDropdown(false)
  }

  const removeCourse = (courseId: number) => {
    setSelectedCourses(selectedCourses.filter((id) => id !== courseId))
  }

  const getSelectedCoursesData = () => {
    return COURSES.filter((course) => selectedCourses.includes(course.id))
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-[30%] border-r border-border/50 flex flex-col backdrop-blur-sm">
        {/* Fixed Search Header */}
        <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Course Selection</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Build your perfect schedule</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-110 active:scale-95 border border-border/40"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-foreground" />
              )}
            </button>
          </div>

          <div className="flex gap-1.5 p-1.5 bg-muted/30 rounded-xl border border-border/40 mb-5">
            <Button
              variant="ghost"
              className={`flex-1 relative transition-all duration-300 ${
                selectedTerm === "fall"
                  ? "bg-card text-foreground shadow-lg shadow-primary/5 border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
              onClick={() => setSelectedTerm("fall")}
            >
              <span className="relative z-10 font-medium">Fall</span>
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 relative transition-all duration-300 ${
                selectedTerm === "winter"
                  ? "bg-card text-foreground shadow-lg shadow-primary/5 border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
              onClick={() => setSelectedTerm("winter")}
            >
              <span className="relative z-10 font-medium">Winter</span>
            </Button>
          </div>

          <div className="relative" ref={searchRef}>
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
                className="pl-11 h-11 bg-card/50 border-border/50 focus:border-primary/50 focus:bg-card transition-all duration-200 rounded-xl relative z-10"
              />
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/20 max-h-[450px] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="overflow-y-auto max-h-[450px] scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
                  {searchResults.map((course, idx) => {
                    const isAlreadyAdded = selectedCourses.includes(course.id)
                    return (
                      <button
                        key={course.id}
                        onClick={() => addCourse(course.id)}
                        disabled={isAlreadyAdded}
                        className={`w-full text-left px-4 py-3.5 transition-all duration-200 border-b border-border/30 last:border-b-0 ${
                          isAlreadyAdded
                            ? "opacity-60 cursor-not-allowed bg-muted/20"
                            : "cursor-pointer hover:bg-accent/60 active:scale-[0.99]"
                        } ${idx === 0 ? "rounded-t-xl" : ""} ${idx === searchResults.length - 1 ? "rounded-b-xl border-b-0" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground">{course.course_code}</div>
                            <div className="text-xs text-foreground/80 mt-1 line-clamp-1">{course.title}</div>
                            <div className="text-xs text-muted-foreground mt-1.5">{course.instructor}</div>
                          </div>
                          {isAlreadyAdded && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg flex-shrink-0">
                              <Sparkles className="w-3 h-3 text-primary" />
                              <span className="text-xs text-primary font-medium">Added</span>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-3">
          {selectedCourses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No courses yet</h3>
              <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                Search and add courses to build your {selectedTerm} schedule
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {getSelectedCoursesData().map((course, idx) => {
                const colorClass = COURSE_COLORS[idx % COURSE_COLORS.length]
                return (
                  <Card
                    key={course.id}
                    className="p-4 glass border-border/40 hover:border-border/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-1 h-14 rounded-full ${colorClass} shadow-lg ${colorClass.replace("bg-", "shadow-")}/50`}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground tracking-tight">{course.course_code}</div>
                          <div className="text-sm text-foreground/80 line-clamp-1 mt-0.5">{course.title}</div>
                          <div className="text-xs text-muted-foreground mt-1.5">{course.instructor}</div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        onClick={() => removeCourse(course.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/50 bg-card/30 backdrop-blur-xl">
          <Link href="/grades">
            <Button
              className="w-full h-11 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 rounded-xl group"
              variant="outline"
            >
              <GraduationCap className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Setup Grades</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Right Panel - Calendar Grid */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border/50 bg-card/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground capitalize tracking-tight">
                {selectedTerm} Schedule
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                {selectedCourses.length > 0
                  ? `${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""} selected`
                  : "Add courses to start building your schedule"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {selectedCourses.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No courses selected</h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Search and add courses from the left sidebar to build your {selectedTerm} schedule
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-[800px]">
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
                  <>
                    <div
                      key={`time-${hour}`}
                      className="bg-background/50 backdrop-blur-sm p-4 text-right text-xs text-muted-foreground font-medium border-r border-border/30"
                    >
                      {hour}:00
                    </div>
                    {DAYS.map((_, dayIndex) => (
                      <div
                        key={`${hour}-${dayIndex}`}
                        className="bg-background/30 backdrop-blur-sm relative min-h-[70px] hover:bg-accent/5 transition-colors duration-200"
                      >
                        {/* Render courses that overlap this time slot */}
                        {getSelectedCoursesData().map((course, courseIdx) => {
                          return course.schedule
                            .filter((slot) => slot.day === dayIndex + 1)
                            .filter((slot) => {
                              const slotStart = slot.start
                              const slotEnd = slot.end
                              return hour >= slotStart && hour < slotEnd
                            })
                            .map((slot) => {
                              if (hour === Math.floor(slot.start)) {
                                const duration = slot.end - slot.start
                                const colorClass = COURSE_COLORS[courseIdx % COURSE_COLORS.length]
                                return (
                                  <div
                                    key={`${course.id}-${slot.day}-${slot.start}`}
                                    className={`absolute inset-x-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group/course border border-border/60 hover:border-primary/40`}
                                    style={{
                                      top: `${(slot.start % 1) * 100}%`,
                                      height: `${duration * 70}px`,
                                    }}
                                  >
                                    {/* Gradient background layer */}
                                    <div className={`absolute inset-0 ${colorClass} opacity-15`} />

                                    {/* Accent border glow on hover */}
                                    <div
                                      className={`absolute inset-0 ${colorClass.replace("bg-", "shadow-")} opacity-0 group-hover/course:opacity-100 blur-xl transition-opacity duration-300`}
                                    />

                                    {/* Content */}
                                    <div className="relative h-full bg-card/90 backdrop-blur-sm p-3.5 flex flex-col">
                                      {/* Top accent bar with subtle animation */}
                                      <div
                                        className={`absolute top-0 left-0 right-0 h-1 ${colorClass} group-hover/course:h-1.5 transition-all duration-300`}
                                      />

                                      {/* Course code with icon */}
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <div
                                          className={`w-1.5 h-1.5 rounded-full ${colorClass} shadow-sm ${colorClass.replace("bg-", "shadow-")}`}
                                        />
                                        <span
                                          className={`font-bold text-sm tracking-tight ${colorClass.replace("bg-", "text-")} group-hover/course:scale-[1.02] transition-transform duration-200`}
                                        >
                                          {course.course_code}
                                        </span>
                                      </div>

                                      {/* Course title */}
                                      <div className="text-xs text-foreground/80 leading-tight line-clamp-2 font-medium">
                                        {course.title}
                                      </div>

                                      {/* Time indicator at bottom if enough space */}
                                      {duration >= 1.5 && (
                                        <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                          <div className="w-3 h-3 rounded-md bg-muted/50 flex items-center justify-center">
                                            <Calendar className="w-2 h-2" />
                                          </div>
                                          <span className="font-medium">
                                            {`${Math.floor(slot.start)}:${((slot.start % 1) * 60).toString().padStart(2, "0")} - ${Math.floor(slot.end)}:${((slot.end % 1) * 60).toString().padStart(2, "0")}`}
                                          </span>
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
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
