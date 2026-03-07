import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Star,
  BookOpen,
  FileText,
  Bell,
  User,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useNotifications } from "@/hooks/useNotifications";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  isBefore,
  parseISO,
} from "date-fns";

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  event_time: string | null;
  end_date: string | null;
  is_important: boolean;
  color: string | null;
  source: string | null;
  source_id: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: "training", label: "Training", icon: BookOpen, color: "bg-blue-500" },
  { value: "deadline", label: "Deadline", icon: AlertTriangle, color: "bg-red-500" },
  { value: "reminder", label: "Reminder", icon: Bell, color: "bg-amber-500" },
  { value: "personal", label: "Personal", icon: User, color: "bg-green-500" },
  { value: "meeting", label: "Meeting", icon: Clock, color: "bg-purple-500" },
  { value: "document", label: "Document", icon: FileText, color: "bg-teal-500" },
];

const getEventTypeConfig = (type: string) =>
  EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[3];

export default function MyCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "personal",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_time: "",
    is_important: false,
  });

  // Also pull in system events (course deadlines, goal deadlines)
  const [systemEvents, setSystemEvents] = useState<CalendarEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase
        .from("calendar_events" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: true }) as any);
      if (error) throw error;
      setEvents((data as CalendarEvent[]) || []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch system-generated events from goals & courses
  const fetchSystemEvents = useCallback(async () => {
    if (!user) return;
    const syntheticEvents: CalendarEvent[] = [];

    // Course enrollment deadlines
    try {
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("id, course_id, enrolled_at, status, courses(title)")
        .eq("user_id", user.id)
        .neq("status", "completed");

      enrollments?.forEach((e: any) => {
        const enrolledDate = new Date(e.enrolled_at);
        const deadlineDate = new Date(enrolledDate);
        deadlineDate.setDate(deadlineDate.getDate() + 30);
        syntheticEvents.push({
          id: `course_${e.id}`,
          user_id: user.id,
          title: `Complete: ${e.courses?.title || "Course"}`,
          description: "Auto-synced from your enrolled courses",
          event_type: "training",
          event_date: format(deadlineDate, "yyyy-MM-dd"),
          event_time: null,
          end_date: null,
          is_important: true,
          color: "blue",
          source: "course",
          source_id: e.course_id,
          created_at: e.enrolled_at,
        });
      });
    } catch (err) {
      console.error("Error fetching course events:", err);
    }

    // Goal deadlines from localStorage
    try {
      const storedGoals = localStorage.getItem(`goals_${user.id}`);
      if (storedGoals) {
        const goals = JSON.parse(storedGoals);
        goals.forEach((goal: any) => {
          if (goal.deadline) {
            const progress = (goal.current_score / goal.target_score) * 100;
            syntheticEvents.push({
              id: `goal_${goal.id}`,
              user_id: user.id,
              title: `Goal: ${goal.category} target (${goal.target_score})`,
              description: `Current: ${goal.current_score}/${goal.target_score} (${Math.round(progress)}%)`,
              event_type: "deadline",
              event_date: goal.deadline,
              event_time: null,
              end_date: null,
              is_important: progress < 50,
              color: "red",
              source: "goal",
              source_id: goal.id,
              created_at: new Date().toISOString(),
            });
          }
        });
      }
    } catch (err) {
      console.error("Error parsing goals:", err);
    }

    setSystemEvents(syntheticEvents);
  }, [user]);

  useEffect(() => {
    fetchEvents();
    fetchSystemEvents();
  }, [fetchEvents, fetchSystemEvents]);

  useRealtimeData({
    table: "calendar_events",
    userId: user?.id,
    onChange: fetchEvents,
  });

  const allEvents = useMemo(() => [...events, ...systemEvents], [events, systemEvents]);

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart);
      const end = endOfWeek(monthEnd);
      return eachDayOfInterval({ start, end });
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, view]);

  const getEventsForDay = useCallback(
    (day: Date) =>
      allEvents.filter((e) => isSameDay(parseISO(e.event_date), day)),
    [allEvents]
  );

  const navigate = (direction: "prev" | "next") => {
    if (view === "month") {
      setCurrentDate((d) => (direction === "prev" ? subMonths(d, 1) : addMonths(d, 1)));
    } else {
      setCurrentDate((d) => (direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)));
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !newEvent.title.trim()) return;
    try {
      const { error } = await (supabase.from("calendar_events" as any).insert({
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description || null,
        event_type: newEvent.event_type,
        event_date: newEvent.event_date,
        event_time: newEvent.event_time || null,
        is_important: newEvent.is_important,
      }) as any);
      if (error) throw error;
      toast({ title: "Event Created", description: "Calendar event added successfully." });
      setDialogOpen(false);
      setNewEvent({
        title: "",
        description: "",
        event_type: "personal",
        event_date: format(new Date(), "yyyy-MM-dd"),
        event_time: "",
        is_important: false,
      });
    } catch (err) {
      console.error("Error creating event:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to create event." });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (id.startsWith("course_") || id.startsWith("goal_")) return; // can't delete system events
    try {
      const { error } = await (supabase.from("calendar_events" as any).delete().eq("id", id) as any);
      if (error) throw error;
      toast({ title: "Event Deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete event." });
    }
  };

  const upcomingImportant = useMemo(() => {
    const today = new Date();
    return allEvents
      .filter((e) => e.is_important && !isBefore(parseISO(e.event_date), today))
      .sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime())
      .slice(0, 5);
  }, [allEvents]);

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            My Calendar
          </h1>
          <p className="text-muted-foreground">Track trainings, deadlines, reminders, and personal events</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Calendar Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent((p) => ({ ...p, event_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Time (optional)</Label>
                  <Input
                    type="time"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent((p) => ({ ...p, event_time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newEvent.event_type}
                  onValueChange={(v) => setNewEvent((p) => ({ ...p, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Add details..."
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={newEvent.is_important}
                  onCheckedChange={(c) => setNewEvent((p) => ({ ...p, is_important: c }))}
                />
                <Label>Mark as important deadline</Label>
              </div>
              <Button onClick={handleCreateEvent} className="w-full" disabled={!newEvent.title.trim()}>
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3 space-y-4">
          {/* View Toggle & Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
                    {view === "month"
                      ? format(currentDate, "MMMM yyyy")
                      : `Week of ${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
                  </h2>
                  <Button variant="outline" size="icon" onClick={() => navigate("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Today
                  </Button>
                  <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-2 sm:p-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className={`grid grid-cols-7 ${view === "week" ? "min-h-[200px]" : ""}`}>
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const hasImportant = dayEvents.some((e) => e.is_important);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative p-1 min-h-[80px] border border-border/50 transition-colors text-left
                        ${view === "week" ? "min-h-[160px]" : ""}
                        ${!isCurrentMonth && view === "month" ? "opacity-40" : ""}
                        ${isSelected ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-muted/50"}
                        ${isToday(day) ? "bg-accent/10" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span
                          className={`text-xs font-medium ${
                            isToday(day)
                              ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {hasImportant && (
                          <Star className="h-3 w-3 text-accent fill-accent" />
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, view === "week" ? 5 : 2).map((event) => {
                          const config = getEventTypeConfig(event.event_type);
                          return (
                            <div
                              key={event.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${config.color} text-white`}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > (view === "week" ? 5 : 2) && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - (view === "week" ? 5 : 2)} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Events */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Events for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedDayEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No events on this day.{" "}
                        <button
                          className="text-primary hover:underline"
                          onClick={() => {
                            setNewEvent((p) => ({ ...p, event_date: format(selectedDate, "yyyy-MM-dd") }));
                            setDialogOpen(true);
                          }}
                        >
                          Add one?
                        </button>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDayEvents.map((event) => {
                          const config = getEventTypeConfig(event.event_type);
                          const Icon = config.icon;
                          const isSystem = event.id.startsWith("course_") || event.id.startsWith("goal_");
                          return (
                            <div
                              key={event.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                event.is_important ? "border-destructive/30 bg-destructive/5" : "border-border"
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${config.color} text-white flex-shrink-0`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-foreground truncate">{event.title}</span>
                                  {event.is_important && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      Important
                                    </Badge>
                                  )}
                                  {isSystem && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      Auto
                                    </Badge>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                )}
                                {event.event_time && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {event.event_time}
                                  </p>
                                )}
                              </div>
                              {!isSystem && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteEvent(event.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Important */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingImportant.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No upcoming deadlines</p>
              ) : (
                <div className="space-y-3">
                  {upcomingImportant.map((event) => {
                    const config = getEventTypeConfig(event.event_type);
                    const daysAway = Math.ceil(
                      (parseISO(event.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div key={event.id} className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.color}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {daysAway === 0
                              ? "Today"
                              : daysAway === 1
                              ? "Tomorrow"
                              : `${daysAway} days away`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {EVENT_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${t.color}`} />
                    <span className="text-xs text-foreground">{t.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Add */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Add</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full gap-2 text-xs"
                onClick={() => {
                  setNewEvent((p) => ({ ...p, event_date: format(new Date(), "yyyy-MM-dd") }));
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Event Today
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
