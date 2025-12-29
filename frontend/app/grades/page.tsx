"use client"

import { useState, useEffect } from "react"
import { Plus, X, GraduationCap, ArrowLeft, TrendingUp, Award, Target, Moon, Sun, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"
import { toast } from "sonner"

type Parameter = {
  id: string
  name: string
  weight: number
  grade?: number
}

type CourseGrades = {
  [courseId: number]: Parameter[]
}

type CourseInfo = {
  id: number
  course_code: string
  title: string
  term: "fall" | "winter"
}

export default function GradesPage() {
  const { theme, toggleTheme } = useTheme()

  const [selectedTerm, setSelectedTerm] = useState<"fall" | "winter">("fall")
  const [fallGrades, setFallGrades] = useState<CourseGrades>({})
  const [winterGrades, setWinterGrades] = useState<CourseGrades>({})
  const [finalGrades, setFinalGrades] = useState<{ [courseId: number]: number }>({})
  const [fallCourses, setFallCourses] = useState<CourseInfo[]>([])
  const [winterCourses, setWinterCourses] = useState<CourseInfo[]>([])

  const currentGrades = selectedTerm === "fall" ? fallGrades : winterGrades
  const setCurrentGrades = selectedTerm === "fall" ? setFallGrades : setWinterGrades
  const displayCourses = selectedTerm === "fall" ? fallCourses : winterCourses

  // Load courses from localStorage on mount
  useEffect(() => {
    // Load persisted fall courses first
    try {
      const persistedFallKey = "gradesCourses_fall"
      const persistedFall = localStorage.getItem(persistedFallKey)
      if (persistedFall) {
        const courses: CourseInfo[] = JSON.parse(persistedFall)
        setFallCourses(courses)
      }
    } catch (error) {
      console.error("Error loading persisted fall courses:", error)
    }

    // Load persisted winter courses
    try {
      const persistedWinterKey = "gradesCourses_winter"
      const persistedWinter = localStorage.getItem(persistedWinterKey)
      if (persistedWinter) {
        const courses: CourseInfo[] = JSON.parse(persistedWinter)
        setWinterCourses(courses)
      }
    } catch (error) {
      console.error("Error loading persisted winter courses:", error)
    }

    // Load fall courses from setup
    try {
      const fallStorageKey = "gradesSetup_fall"
      const fallStored = localStorage.getItem(fallStorageKey)
      if (fallStored) {
        const fallCoursesFromStorage: CourseInfo[] = JSON.parse(fallStored)
        
        // Merge with existing courses (don't replace)
        setFallCourses((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const newCourses = fallCoursesFromStorage.filter((c) => !existingIds.has(c.id))
          
          if (newCourses.length > 0) {
            toast.success(`${newCourses.length} Fall course${newCourses.length > 1 ? "s" : ""} added`, {
              description: "Set up your assessments and grades",
            })
            // Clear the transfer storage after loading
            localStorage.removeItem(fallStorageKey)
            const updatedCourses = [...prev, ...newCourses]
            // Persist to permanent storage
            localStorage.setItem("gradesCourses_fall", JSON.stringify(updatedCourses))
            return updatedCourses
          }
          return prev
        })
      }
    } catch (error) {
      console.error("Error loading fall courses:", error)
    }

    // Load winter courses from setup
    try {
      const winterStorageKey = "gradesSetup_winter"
      const winterStored = localStorage.getItem(winterStorageKey)
      if (winterStored) {
        const winterCoursesFromStorage: CourseInfo[] = JSON.parse(winterStored)
        
        // Merge with existing courses (don't replace)
        setWinterCourses((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const newCourses = winterCoursesFromStorage.filter((c) => !existingIds.has(c.id))
          
          if (newCourses.length > 0) {
            toast.success(`${newCourses.length} Winter course${newCourses.length > 1 ? "s" : ""} added`, {
              description: "Set up your assessments and grades",
            })
            // Clear the transfer storage after loading
            localStorage.removeItem(winterStorageKey)
            const updatedCourses = [...prev, ...newCourses]
            // Persist to permanent storage
            localStorage.setItem("gradesCourses_winter", JSON.stringify(updatedCourses))
            return updatedCourses
          }
          return prev
        })
      }
    } catch (error) {
      console.error("Error loading winter courses:", error)
    }
  }, [])

  const addParameter = (courseId: number) => {
    const newParameter: Parameter = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      weight: 0,
      grade: undefined,
    }

    setCurrentGrades({
      ...currentGrades,
      [courseId]: [...(currentGrades[courseId] || []), newParameter],
    })
  }

  const removeParameter = (courseId: number, parameterId: string) => {
    setCurrentGrades({
      ...currentGrades,
      [courseId]: currentGrades[courseId].filter((p) => p.id !== parameterId),
    })
  }

  const updateParameter = (courseId: number, parameterId: string, field: keyof Parameter, value: string | number) => {
    setCurrentGrades({
      ...currentGrades,
      [courseId]: currentGrades[courseId].map((p) => (p.id === parameterId ? { ...p, [field]: value } : p)),
    })
  }

  const calculateFinalGrade = (courseId: number) => {
    const parameters = currentGrades[courseId] || []
    const totalWeight = parameters.reduce((sum, p) => sum + p.weight, 0)

    if (totalWeight === 0 || totalWeight !== 100) {
      toast.error("Please ensure parameter weights add up to 100%")
      return
    }

    const hasAllGradesCheck = parameters.every((p) => p.grade !== undefined && p.grade >= 0)
    if (!hasAllGradesCheck) {
      toast.error("Please enter grades for all parameters")
      return
    }

    const finalGrade = parameters.reduce((sum, p) => sum + (p.grade || 0) * (p.weight / 100), 0)
    setFinalGrades({ ...finalGrades, [courseId]: finalGrade })
    toast.success(`Final grade calculated: ${finalGrade.toFixed(1)}%`)
  }

  const getTotalWeight = (courseId: number) => {
    const parameters = currentGrades[courseId] || []
    return parameters.reduce((sum, p) => sum + p.weight, 0)
  }

  const hasAllGrades = (courseId: number) => {
    const parameters = currentGrades[courseId] || []
    if (parameters.length === 0) return false
    return parameters.every((p) => p.grade !== undefined && p.grade >= 0)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(var(--primary)/0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,oklch(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000,transparent)]" />
      </div>

      <div className="relative border-b border-border/30 bg-background/60 backdrop-blur-2xl sticky top-0 z-20 shadow-xl">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 hover:bg-primary/10 transition-all duration-300 hover:scale-110 active:scale-95 rounded-2xl group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </Button>
              </Link>

              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-2xl blur-2xl animate-pulse" />
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg shadow-primary/20">
                    <Award className="w-7 h-7 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-black text-foreground tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text">
                    Grade Analytics
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    Performance tracking & predictive analysis
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-110 active:scale-95 border border-border/40"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-foreground" />
                )}
              </button>

              <div className="flex gap-2 p-2 bg-muted/40 rounded-2xl border-2 border-border/40 backdrop-blur-xl shadow-lg">
                <button
                  className={`relative px-12 py-3 rounded-xl font-bold text-sm transition-all duration-500 overflow-hidden group ${
                    selectedTerm === "fall" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSelectedTerm("fall")}
                >
                  {selectedTerm === "fall" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80 shadow-xl shadow-primary/30 animate-in fade-in zoom-in-95 duration-300" />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Fall 2025
                  </span>
                </button>
                <button
                  className={`relative px-12 py-3 rounded-xl font-bold text-sm transition-all duration-500 overflow-hidden group ${
                    selectedTerm === "winter"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSelectedTerm("winter")}
                >
                  {selectedTerm === "winter" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80 shadow-xl shadow-primary/30 animate-in fade-in zoom-in-95 duration-300" />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Winter 2026
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-[1800px] mx-auto px-8 py-12">
        {displayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-muted/60 via-muted/30 to-muted/10 border-2 border-border/40 flex items-center justify-center backdrop-blur-sm">
                <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">No courses for {selectedTerm === "fall" ? "Fall 2025" : "Winter 2026"}</h2>
            <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
              Add courses from the Schedule Builder to start tracking your grades.
            </p>
            <Link href="/">
              <Button className="rounded-xl bg-primary hover:bg-primary/90">
                Go to Schedule Builder
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
            {displayCourses.map((course) => {
              const parameters = currentGrades[course.id] || []
              const finalGrade = finalGrades[course.id]
              const totalWeight = getTotalWeight(course.id)
              const allGradesEntered = hasAllGrades(course.id)

              return (
                <Card
                  key={course.id}
                  className="group relative overflow-hidden bg-card/60 backdrop-blur-2xl border-2 border-border/40 hover:border-primary/40 transition-all duration-700 hover:shadow-2xl hover:shadow-primary/10 rounded-3xl animate-in fade-in zoom-in-95 duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700" />

                  <div className="relative p-7 pb-6 border-b-2 border-border/30 bg-gradient-to-br from-primary/5 via-background/50 to-transparent">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <GraduationCap className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="font-black text-2xl text-foreground tracking-tight">{course.course_code}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">{course.title}</p>
                      </div>

                      {finalGrade !== undefined && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 animate-in zoom-in-95 duration-300">
                          <Zap className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-muted-foreground">Weight Progress</span>
                        <span
                          className={`tabular-nums px-2.5 py-1 rounded-lg ${
                            totalWeight === 100
                              ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                              : totalWeight > 100
                                ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                : "bg-muted/50 text-muted-foreground border border-border/40"
                          }`}
                        >
                          {totalWeight}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden border border-border/40">
                        <div
                          className={`h-full transition-all duration-700 relative overflow-hidden ${
                            totalWeight === 100
                              ? "bg-gradient-to-r from-green-500 via-emerald-500 to-green-400"
                              : totalWeight > 100
                                ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-400"
                                : "bg-gradient-to-r from-primary via-primary/80 to-primary"
                          }`}
                          style={{ width: `${Math.min(totalWeight, 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative p-7">
                    <button
                      className="group/btn relative w-full mb-7 h-14 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/60 bg-gradient-to-br from-muted/30 to-muted/10 hover:from-primary/10 hover:to-primary/5 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden"
                      onClick={() => addParameter(course.id)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      <Plus className="relative w-5 h-5 text-primary transition-transform duration-500 group-hover/btn:rotate-90" />
                      <span className="relative font-bold text-sm text-foreground">Add Assessment</span>
                    </button>

                    <div className="space-y-4 mb-7 min-h-[200px]">
                      {parameters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-muted/60 via-muted/30 to-muted/10 border-2 border-border/40 flex items-center justify-center backdrop-blur-sm">
                              <TrendingUp className="w-10 h-10 text-muted-foreground/50" />
                            </div>
                          </div>
                          <p className="text-base font-bold text-foreground mb-2">No assessments yet</p>
                          <p className="text-sm text-muted-foreground/80 max-w-[220px] leading-relaxed">
                            Start adding your assignments, tests, and exams
                          </p>
                        </div>
                      ) : (
                        parameters.map((param, index) => (
                          <div
                            key={param.id}
                            className="group/param relative animate-in fade-in slide-in-from-top-4 duration-500"
                            style={{ animationDelay: `${index * 80}ms` }}
                          >
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-2xl opacity-0 group-hover/param:opacity-100 blur-sm transition-opacity duration-300" />
                            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-background/90 via-background/80 to-muted/20 border-2 border-border/40 hover:border-border/60 transition-all duration-300 hover:shadow-xl backdrop-blur-xl">
                              <div className="flex items-center gap-3 mb-5">
                                <Input
                                  placeholder="e.g., Midterm Exam"
                                  value={param.name}
                                  onChange={(e) => updateParameter(course.id, param.id, "name", e.target.value)}
                                  className="flex-1 h-11 bg-background/80 border-border/50 focus:border-primary/60 rounded-xl font-semibold text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-11 w-11 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl opacity-0 group-hover/param:opacity-100 hover:scale-110 active:scale-95"
                                  onClick={() => removeParameter(course.id, param.id)}
                                >
                                  <X className="w-5 h-5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-black text-muted-foreground mb-2.5 block uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Weight
                                  </label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      value={param.weight || ""}
                                      onChange={(e) =>
                                        updateParameter(course.id, param.id, "weight", Number(e.target.value))
                                      }
                                      className="h-12 pr-10 bg-background/80 border-border/50 focus:border-primary/60 rounded-xl font-bold text-lg transition-all duration-200 focus:ring-2 focus:ring-primary/20 tabular-nums"
                                      min="0"
                                      max="100"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-muted-foreground mb-2.5 block uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Grade
                                  </label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      value={param.grade ?? ""}
                                      onChange={(e) =>
                                        updateParameter(course.id, param.id, "grade", Number(e.target.value))
                                      }
                                      className="h-12 pr-10 bg-background/80 border-border/50 focus:border-primary/60 rounded-xl font-bold text-lg transition-all duration-200 focus:ring-2 focus:ring-primary/20 tabular-nums"
                                      min="0"
                                      max="100"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {finalGrade !== undefined && (
                      <div className="mb-7 relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-3xl animate-pulse" />
                        <div className="relative p-8 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 rounded-3xl border-2 border-primary/40 backdrop-blur-xl shadow-2xl shadow-primary/20">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/30">
                                <Award className="w-5 h-5 text-primary" />
                              </div>
                              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                Final Grade
                              </p>
                            </div>
                            <div className="p-2 rounded-xl bg-green-500/20 border border-green-500/30">
                              <Zap className="w-4 h-4 text-green-500" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary to-primary/60 tracking-tighter tabular-nums drop-shadow-lg">
                              {finalGrade.toFixed(1)}
                            </p>
                            <span className="text-3xl font-black text-primary/60 mb-2">%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      className={`relative w-full h-14 rounded-2xl font-black text-base transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] overflow-hidden group/calc ${
                        parameters.length === 0 || totalWeight !== 100 || !allGradesEntered
                          ? "bg-muted/50 text-muted-foreground cursor-not-allowed border-2 border-muted"
                          : "bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-2xl shadow-primary/30 hover:shadow-3xl hover:shadow-primary/40 border-2 border-primary/50"
                      }`}
                      onClick={() => calculateFinalGrade(course.id)}
                      disabled={parameters.length === 0 || totalWeight !== 100 || !allGradesEntered}
                    >
                      {!finalGrade && parameters.length > 0 && totalWeight === 100 && allGradesEntered && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/calc:translate-x-full transition-transform duration-1000" />
                      )}
                      <TrendingUp className="w-5 h-5 mr-3" />
                      <span>Calculate Final Grade</span>
                    </Button>

                    {parameters.length > 0 && totalWeight !== 100 && (
                      <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm">
                        <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-bold">
                          ⚠️ Weights must total 100% (currently {totalWeight}%)
                        </p>
                      </div>
                    )}
                    {parameters.length > 0 && totalWeight === 100 && !allGradesEntered && (
                      <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm">
                        <p className="text-xs text-blue-600 dark:text-blue-400 text-center font-bold">
                          📝 Enter grades for all assessments to calculate
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
