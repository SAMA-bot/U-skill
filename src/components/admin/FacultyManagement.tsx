import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getUserFriendlyError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, UserPlus, Loader2, Eye, UserX, BarChart3, GraduationCap,
  FileText, TrendingUp, Award, Clock, CheckCircle2,
} from "lucide-react";

interface FacultyRow {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
  created_at: string;
  performanceScore?: number;
  badge?: string;
}

interface TrainingRecord {
  id: string;
  course_title: string;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
}

interface DocumentRecord {
  id: string;
  title: string;
  document_type: string;
  status: string;
  created_at: string;
}

interface PerformanceMetric {
  month: string;
  year: number;
  teaching_score: number | null;
  research_score: number | null;
  service_score: number | null;
}

const TRAINING_TARGET = 10;
const PUBLICATION_TARGET = 5;

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "", password: "", fullName: "", department: "", designation: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { fetchFaculty(); }, []);

  const fetchFaculty = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, department, designation, avatar_url, created_at")
        .order("full_name");
      if (error) throw error;

      // Batch fetch performance data for all users
      const userIds = (profiles || []).map((p) => p.user_id);

      const [enrollRes, actTrainRes, actPubRes, perfRes] = await Promise.all([
        supabase.from("course_enrollments").select("user_id").eq("status", "completed").in("user_id", userIds),
        supabase.from("activities").select("user_id").eq("status", "completed").in("activity_type", ["workshop", "seminar", "conference", "training"]).in("user_id", userIds),
        supabase.from("activities").select("user_id").eq("status", "completed").in("activity_type", ["publication", "research"]).in("user_id", userIds),
        supabase.from("performance_metrics").select("user_id, teaching_score").in("user_id", userIds),
      ]);

      // Build per-user score maps
      const trainCountMap = new Map<string, number>();
      [...(enrollRes.data || []), ...(actTrainRes.data || [])].forEach((r) => {
        trainCountMap.set(r.user_id, (trainCountMap.get(r.user_id) || 0) + 1);
      });
      const pubCountMap = new Map<string, number>();
      (actPubRes.data || []).forEach((r) => {
        pubCountMap.set(r.user_id, (pubCountMap.get(r.user_id) || 0) + 1);
      });
      const feedbackMap = new Map<string, { total: number; count: number }>();
      (perfRes.data || []).forEach((r) => {
        const existing = feedbackMap.get(r.user_id) || { total: 0, count: 0 };
        existing.total += r.teaching_score || 0;
        existing.count += 1;
        feedbackMap.set(r.user_id, existing);
      });

      const facultyWithScores: FacultyRow[] = (profiles || []).map((p) => {
        const trainCount = trainCountMap.get(p.user_id) || 0;
        const trainingScore = Math.min(Math.round((trainCount / TRAINING_TARGET) * 100), 100);
        const fb = feedbackMap.get(p.user_id);
        const feedbackScore = fb && fb.count > 0 ? Math.round(fb.total / fb.count) : 0;
        const pubCount = pubCountMap.get(p.user_id) || 0;
        const pubScore = Math.min(Math.round((pubCount / PUBLICATION_TARGET) * 100), 100);
        const composite = Math.round(trainingScore * 0.3 + feedbackScore * 0.4 + pubScore * 0.3);
        return {
          ...p,
          performanceScore: composite,
          badge: composite >= 80 ? "Excellent" : composite >= 60 ? "Good" : "Needs Improvement",
        };
      });

      setFaculty(facultyWithScores);
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "Error", description: "Failed to load faculty", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (fac: FacultyRow) => {
    setSelectedFaculty(fac);
    setProfileOpen(true);
    setProfileLoading(true);

    try {
      const [enrollRes, docRes, metricRes] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select("id, status, progress_percentage, enrolled_at, completed_at, course_id")
          .eq("user_id", fac.user_id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("faculty_documents")
          .select("id, title, document_type, status, created_at")
          .eq("user_id", fac.user_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("performance_metrics")
          .select("month, year, teaching_score, research_score, service_score")
          .eq("user_id", fac.user_id)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(12),
      ]);

      // Fetch course titles
      const courseIds = (enrollRes.data || []).map((e: any) => e.course_id);
      let courseMap = new Map<string, string>();
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from("courses")
          .select("id, title")
          .in("id", courseIds);
        (courses || []).forEach((c) => courseMap.set(c.id, c.title));
      }

      setTrainings(
        (enrollRes.data || []).map((e: any) => ({
          ...e,
          course_title: courseMap.get(e.course_id) || "Unknown Course",
        }))
      );
      setDocuments(docRes.data || []);
      setMetrics(metricRes.data || []);
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast({ title: "Validation Error", description: "Fill in all required fields", variant: "destructive" });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.functions.invoke("create-user", {
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          department: newUser.department || null,
          role: "faculty",
        },
      });
      if (error) throw error;

      toast({ title: "Faculty Added", description: `Successfully created ${newUser.email}` });
      setNewUser({ email: "", password: "", fullName: "", department: "", designation: "" });
      setAddDialogOpen(false);
      fetchFaculty();
    } catch (error: any) {
      toast({ title: "Error", description: getUserFriendlyError(error, "general"), variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (fac: FacultyRow) => {
    if (!confirm(`Are you sure you want to deactivate ${fac.full_name}? This will delete their account.`)) return;
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId: fac.user_id },
      });
      if (error) throw error;
      setFaculty((prev) => prev.filter((f) => f.user_id !== fac.user_id));
      toast({ title: "Faculty Deactivated", description: `${fac.full_name} has been removed` });
    } catch (error: any) {
      toast({ title: "Error", description: getUserFriendlyError(error, "general"), variant: "destructive" });
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case "Excellent": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Good": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": case "verified": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "pending": case "enrolled": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const departments = [...new Set(faculty.map((f) => f.department).filter(Boolean))] as string[];

  const filtered = faculty.filter((f) => {
    const matchesDept = departmentFilter === "all" || f.department === departmentFilter;
    const matchesSearch =
      f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.department?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faculty Management</h1>
          <p className="text-muted-foreground">
            Manage faculty profiles, view performance, and track activity
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Faculty
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Faculty", value: faculty.length, icon: GraduationCap, color: "text-primary" },
          { label: "Excellent", value: faculty.filter((f) => f.badge === "Excellent").length, icon: Award, color: "text-emerald-500" },
          { label: "Good", value: faculty.filter((f) => f.badge === "Good").length, icon: TrendingUp, color: "text-blue-500" },
          { label: "Needs Improvement", value: faculty.filter((f) => f.badge === "Needs Improvement").length, icon: BarChart3, color: "text-amber-500" },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <card.icon className={`h-5 w-5 ${card.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Faculty Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Performance Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No faculty found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((fac) => (
                  <TableRow key={fac.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={fac.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(fac.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{fac.full_name}</p>
                          <p className="text-xs text-muted-foreground">{fac.designation || "Faculty"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fac.department || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {fac.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <Progress value={fac.performanceScore} className="h-1.5" />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-8">
                          {fac.performanceScore}
                        </span>
                        <Badge className={`text-[10px] ${getBadgeStyle(fac.badge)}`}>
                          {fac.badge}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openProfile(fac)}
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user?.id !== fac.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeactivate(fac)}
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Faculty Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Faculty</DialogTitle>
            <DialogDescription>
              Create a new faculty account. They will receive an email to verify their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                placeholder="Dr. Jane Smith"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="jane@university.edu"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="Computer Science"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Add Faculty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Faculty Profile Sheet */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            {selectedFaculty && (
              <div className="flex items-center gap-4 pb-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedFaculty.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(selectedFaculty.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-left">{selectedFaculty.full_name}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{selectedFaculty.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedFaculty.department || "Unassigned"}
                    </Badge>
                    <Badge className={`text-xs ${getBadgeStyle(selectedFaculty.badge)}`}>
                      Score: {selectedFaculty.performanceScore}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </SheetHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="trainings" className="mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="trainings" className="flex-1">
                  <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                  Trainings ({trainings.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Documents ({documents.length})
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex-1">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Metrics
                </TabsTrigger>
              </TabsList>

              {/* Training History */}
              <TabsContent value="trainings" className="space-y-3 mt-4">
                {trainings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No training records</p>
                ) : (
                  trainings.map((t) => (
                    <div key={t.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm text-foreground">{t.course_title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Enrolled {new Date(t.enrolled_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={`text-[10px] ${getStatusStyle(t.status)}`}>
                          {t.status === "completed" ? (
                            <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Completed</>
                          ) : (
                            "In Progress"
                          )}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={t.progress_percentage} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{t.progress_percentage}%</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Documents */}
              <TabsContent value="documents" className="space-y-3 mt-4">
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No documents uploaded</p>
                ) : (
                  documents.map((d) => (
                    <div key={d.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.document_type} · {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${getStatusStyle(d.status)}`}>
                        {d.status}
                      </Badge>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Performance Metrics */}
              <TabsContent value="performance" className="space-y-3 mt-4">
                {metrics.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No performance data</p>
                ) : (
                  metrics.map((m, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-3">
                      <p className="text-sm font-medium text-foreground mb-2">
                        {m.month} {m.year}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Teaching", value: m.teaching_score },
                          { label: "Research", value: m.research_score },
                          { label: "Service", value: m.service_score },
                        ].map((s) => (
                          <div key={s.label}>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{s.label}</span>
                              <span>{s.value || 0}</span>
                            </div>
                            <Progress value={s.value || 0} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
