"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { X, Minimize2, Maximize2, Clock, User, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface CourseSection {
  section: string
  instructor: string
  location: string
  capacity: string
  schedule: { day: number; start: number; end: number }[]
}

interface Course {
  id: number
  course_code: string
  title: string
  instructor: string
  description?: string
  credits: number
  sections: CourseSection[]
  schedule: { day: number; start: number; end: number }[]
}

interface CourseBottomSheetProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onSectionHover: (section: CourseSection | null) => void
  colorClass: string
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"]

export function CourseBottomSheet({ course, isOpen, onClose, onSectionHover, colorClass }: CourseBottomSheetProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [height, setHeight] = useState(400)
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false)
    }
  }, [isOpen])

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartY.current = e.clientY
    dragStartHeight.current = height
    e.preventDefault()
  }

  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      if (!isDragging) return
      const delta = dragStartY.current - e.clientY
      const newHeight = Math.max(200, Math.min(800, dragStartHeight.current + delta))
      setHeight(newHeight)
    }

    const handleDragEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleDrag)
      document.addEventListener("mouseup", handleDragEnd)
      return () => {
        document.removeEventListener("mousemove", handleDrag)
        document.removeEventListener("mouseup", handleDragEnd)
      }
    }
  }, [isDragging])

  if (!isOpen || !course) return null

  return (
    <>
      <div
        className={`fixed inset-0 bg-background/5 backdrop-blur-[0.5px] transition-opacity duration-300 ${
          isMinimized ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
        style={{ zIndex: 40 }}
        onClick={() => setIsMinimized(true)}
      />

      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-out ${
          isMinimized ? "translate-y-[calc(100%-60px)]" : "translate-y-0"
        }`}
        style={{
          height: isMinimized ? "60px" : `${height}px`,
          zIndex: 50,
        }}
      >
        <div className="h-full bg-background/40 backdrop-blur-xl border-t border-l border-r border-border/20 rounded-t-3xl shadow-2xl shadow-black/5 flex flex-col overflow-hidden">
          <div
            className="h-6 flex items-center justify-center cursor-ns-resize hover:bg-accent/20 active:bg-accent/30 transition-colors group flex-shrink-0"
            onMouseDown={handleDragStart}
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 group-hover:bg-muted-foreground/40 transition-colors" />
          </div>

          <div className="px-6 py-3 border-b border-border/20 flex items-center justify-between flex-shrink-0 bg-background/20">
            <div className="flex items-center gap-4">
              <div
                className={`w-1 h-10 rounded-full ${colorClass} shadow-md ${colorClass.replace("bg-", "shadow-")}/30`}
              />
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">{course.course_code}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{course.title}</p>
              </div>
              <div className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg backdrop-blur-sm">
                <span className="text-xs font-semibold text-primary">{course.credits} Credits</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-xl hover:bg-accent/40 transition-all backdrop-blur-sm"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all backdrop-blur-sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              {/* Course Info */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-2.5 tracking-tight">Course Information</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {course.description ||
                    "This course provides a comprehensive introduction to the fundamental concepts and principles. Students will engage with both theoretical frameworks and practical applications."}
                </p>
                <div className="flex items-center gap-2 text-sm px-3 py-2 bg-muted/20 backdrop-blur-md rounded-xl border border-border/20">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground/90 font-medium">{course.instructor}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 tracking-tight">Available Sections</h4>
                <div className="grid gap-3">
                  {course.sections.map((section) => (
                    <Card
                      key={section.section}
                      className="p-4 bg-card/30 backdrop-blur-lg border-border/30 hover:border-primary/50 hover:bg-card/50 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01]"
                      onMouseEnter={() => onSectionHover(section)}
                      onMouseLeave={() => onSectionHover(null)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground">Section {section.section}</span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/30 backdrop-blur-sm rounded-lg border border-border/20">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">{section.capacity}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-foreground/80">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs">{section.instructor}</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground/80">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs">{section.location}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border/20">
                            <div className="flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-foreground/80 space-y-1 font-medium">
                                {section.schedule.map((slot, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-primary font-semibold min-w-[32px]">
                                      {DAYS_SHORT[slot.day - 1]}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {`${Math.floor(slot.start)}:${((slot.start % 1) * 60).toString().padStart(2, "0")} - ${Math.floor(slot.end)}:${((slot.end % 1) * 60).toString().padStart(2, "0")}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0 hover:scale-105 transition-all bg-transparent backdrop-blur-sm"
                        >
                          Add
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
