import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  TrendingUp,
  Award,
  Search,
  BarChart3,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
}

interface DeptData {
  name: string;
  faculty: Profile[];
  hod: Profile | null;
  avgPerformance: number;
  avgTeaching: number;
  avgResearch: number;
  avgService: number;
  totalTrainings: number;
  totalDocuments: number;
}

const DepartmentManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [performanceMap, setPerformanceMap] = useState<
    Record<string, { teaching: number; research: number; service: number; count: number }>
  >({});
  const [trainingMap, setTrainingMap] = useState<Record<string, number>>({});
  const [docMap, setDocMap] = useState<Record<string, number>>({});
  const [hodMap, setHodMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingDept, setEditingDept] = useState("");
  const [deptName, setDeptName] = useState("");
  const [selectedHod, setSelectedHod] = useState<string>("none");

  // Delete confirm
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDept, setDeletingDept] = useState("");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, perfRes, enrollRes, docsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, department, designation"),
        supabase.from("performance_metrics").select("user_id, teaching_score, research_score, service_score"),
        supabase.from("course_enrollments").select("user_id, status"),
        supabase.from("faculty_documents").select("user_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      setProfiles(profilesRes.data || []);

      // Build performance map by user
      const pMap: Record<string, { teaching: number; research: number; service: number; count: number }> = {};
      for (const p of perfRes.data || []) {
        if (!pMap[p.user_id]) pMap[p.user_id] = { teaching: 0, research: 0, service: 0, count: 0 };
        pMap[p.user_id].teaching += p.teaching_score || 0;
        pMap[p.user_id].research += p.research_score || 0;
        pMap[p.user_id].service += p.service_score || 0;
        pMap[p.user_id].count += 1;
      }
      setPerformanceMap(pMap);

      // Training count by user
      const tMap: Record<string, number> = {};
      for (const e of enrollRes.data || []) {
        if (e.status === "completed") {
          tMap[e.user_id] = (tMap[e.user_id] || 0) + 1;
        }
      }
      setTrainingMap(tMap);

      // Doc count by user
      const dMap: Record<string, number> = {};
      for (const d of docsRes.data || []) {
        dMap[d.user_id] = (dMap[d.user_id] || 0) + 1;
      }
      setDocMap(dMap);

      // HOD map
      const hMap: Record<string, string> = {};
      for (const r of rolesRes.data || []) {
        if (r.role === "hod") {
          const profile = (profilesRes.data || []).find((p) => p.user_id === r.user_id);
          if (profile?.department) {
            hMap[profile.department] = r.user_id;
          }
        }
      }
      setHodMap(hMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const departments: DeptData[] = useMemo(() => {
    const deptGroupMap = new Map<string, Profile[]>();
    for (const p of profiles) {
      const dept = p.department || "Unassigned";
      if (!deptGroupMap.has(dept)) deptGroupMap.set(dept, []);
      deptGroupMap.get(dept)!.push(p);
    }

    return Array.from(deptGroupMap.entries()).map(([name, faculty]) => {
      let totalTeaching = 0, totalResearch = 0, totalService = 0, perfCount = 0;
      let totalTrainings = 0, totalDocs = 0;

      for (const f of faculty) {
        const pm = performanceMap[f.user_id];
        if (pm && pm.count > 0) {
          totalTeaching += pm.teaching / pm.count;
          totalResearch += pm.research / pm.count;
          totalService += pm.service / pm.count;
          perfCount++;
        }
        totalTrainings += trainingMap[f.user_id] || 0;
        totalDocs += docMap[f.user_id] || 0;
      }

      const avgTeaching = perfCount > 0 ? Math.round(totalTeaching / perfCount) : 0;
      const avgResearch = perfCount > 0 ? Math.round(totalResearch / perfCount) : 0;
      const avgService = perfCount > 0 ? Math.round(totalService / perfCount) : 0;
      const avgPerformance = perfCount > 0 ? Math.round((avgTeaching + avgResearch + avgService) / 3) : 0;

      const hodUserId = hodMap[name];
      const hod = hodUserId ? faculty.find((f) => f.user_id === hodUserId) || null : null;

      return {
        name,
        faculty,
        hod,
        avgPerformance,
        avgTeaching,
        avgResearch,
        avgService,
        totalTrainings,
        totalDocuments: totalDocs,
      };
    }).sort((a, b) => b.avgPerformance - a.avgPerformance);
  }, [profiles, performanceMap, trainingMap, docMap, hodMap]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.hod?.full_name || "").toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (score > 0) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-muted text-muted-foreground";
  };

  const summaryCards = [
    { label: "Total Departments", value: departments.length, icon: Building2, color: "from-blue-500 to-blue-600" },
    { label: "Total Faculty", value: profiles.length, icon: Users, color: "from-green-500 to-green-600" },
    {
      label: "Avg Performance",
      value: departments.length > 0
        ? `${Math.round(departments.reduce((s, d) => s + d.avgPerformance, 0) / departments.length)}%`
        : "0%",
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
    },
    {
      label: "Top Department",
      value: departments[0]?.name || "N/A",
      icon: Award,
      color: "from-orange-500 to-orange-600",
    },
  ];

  // Chart data
  const barChartData = departments
    .filter((d) => d.name !== "Unassigned")
    .slice(0, 8)
    .map((d) => ({
      name: d.name.length > 12 ? d.name.slice(0, 12) + "…" : d.name,
      Performance: d.avgPerformance,
      Faculty: d.faculty.length,
      Trainings: d.totalTrainings,
    }));

  const radarData = departments
    .filter((d) => d.name !== "Unassigned" && d.avgPerformance > 0)
    .slice(0, 5)
    .map((d) => ({
      department: d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name,
      Teaching: d.avgTeaching,
      Research: d.avgResearch,
      Service: d.avgService,
    }));

  const openAddDialog = () => {
    setDialogMode("add");
    setDeptName("");
    setSelectedHod("none");
    setDialogOpen(true);
  };

  const openEditDialog = (dept: DeptData) => {
    setDialogMode("edit");
    setEditingDept(dept.name);
    setDeptName(dept.name);
    setSelectedHod(dept.hod?.user_id || "none");
    setDialogOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!deptName.trim()) {
      toast({ title: "Error", description: "Department name is required", variant: "destructive" });
      return;
    }

    try {
      if (dialogMode === "add") {
        // Check if department already exists
        if (departments.some((d) => d.name.toLowerCase() === deptName.trim().toLowerCase())) {
          toast({ title: "Error", description: "Department already exists", variant: "destructive" });
          return;
        }
        toast({ title: "Department Created", description: `${deptName} has been created. Assign faculty to populate it.` });
      } else {
        // Rename: update all profiles with old dept name
        if (editingDept !== deptName.trim()) {
          const { error } = await supabase
            .from("profiles")
            .update({ department: deptName.trim() })
            .eq("department", editingDept);
          if (error) throw error;
        }
        toast({ title: "Department Updated", description: `${deptName} has been updated.` });
      }

      // Update HOD assignment if changed
      if (selectedHod && selectedHod !== "none") {
        // Assign HOD role via edge function
        const { error } = await supabase.functions.invoke("update-user-role", {
          body: { userId: selectedHod, newRole: "hod" },
        });
        if (error) console.error("HOD assignment error:", error);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      // Set all faculty in this dept to unassigned
      const { error } = await supabase
        .from("profiles")
        .update({ department: null })
        .eq("department", deletingDept);
      if (error) throw error;

      toast({ title: "Department Deleted", description: `${deletingDept} has been removed. Faculty moved to Unassigned.` });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground">Manage departments and view performance summaries</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`bg-gradient-to-br ${stat.color} rounded-md p-2`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments or HOD..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Department Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            All Departments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Head of Department</TableHead>
                <TableHead className="text-center">Faculty Count</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead className="text-center">Trainings</TableHead>
                <TableHead className="text-center">Documents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((dept, i) => (
                <TableRow key={dept.name}>
                  <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                  <TableCell className="font-medium text-foreground">{dept.name}</TableCell>
                  <TableCell>
                    {dept.hod ? (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-foreground">{dept.hod.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{dept.faculty.length}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getPerformanceColor(dept.avgPerformance)}>
                      {dept.avgPerformance}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{dept.totalTrainings}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{dept.totalDocuments}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(dept)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {dept.name !== "Unassigned" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingDept(dept.name);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No departments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Department Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Performance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Trainings" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No performance data</p>
            )}
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Skill Breakdown by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="department" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs fill-muted-foreground" />
                  <Radar name="Teaching" dataKey="Teaching" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  <Radar name="Research" dataKey="Research" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45%)" fillOpacity={0.2} />
                  <Radar name="Service" dataKey="Service" stroke="hsl(38 92% 50%)" fill="hsl(38 92% 50%)" fillOpacity={0.2} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No skill data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Add Department" : "Edit Department"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "Create a new department. Assign faculty from Faculty Management."
                : "Update department name and head of department."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label>Head of Department</Label>
              <Select value={selectedHod} onValueChange={setSelectedHod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select HOD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {profiles
                    .filter((p) =>
                      dialogMode === "edit"
                        ? p.department === editingDept
                        : true
                    )
                    .map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name} ({p.department || "Unassigned"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment}>
              {dialogMode === "add" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingDept}</strong>? All faculty in this department will be moved to "Unassigned".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
