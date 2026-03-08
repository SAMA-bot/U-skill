import { useState, useEffect, useMemo, useCallback } from "react";
import { useMultipleRealtimeData } from "@/hooks/useRealtimeData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Award,
  Plus,
  Trophy,
  Star,
  Medal,
  Search,
  Loader2,
  TrendingUp,
  Users,
  Crown,
  Sparkles,
  Calendar,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
}

interface AchievementRow {
  id: string;
  user_id: string;
  badge_name: string;
  badge_icon: string;
  description: string | null;
  earned_at: string;
}

interface TopFaculty {
  profile: Profile;
  badgeCount: number;
  avgPerformance: number;
}

const BADGE_ICONS = [
  { value: "award", label: "Award", icon: Award },
  { value: "trophy", label: "Trophy", icon: Trophy },
  { value: "star", label: "Star", icon: Star },
  { value: "medal", label: "Medal", icon: Medal },
  { value: "crown", label: "Crown", icon: Crown },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "trending-up", label: "Trending Up", icon: TrendingUp },
];

const getIconComponent = (iconName: string) => {
  const found = BADGE_ICONS.find((b) => b.value === iconName);
  return found ? found.icon : Award;
};

const AchievementManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [perfMap, setPerfMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    title: "",
    description: "",
    icon: "award",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refetchCb = useCallback(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useMultipleRealtimeData([
    { table: "achievement_badges", onChange: refetchCb },
    { table: "performance_metrics", onChange: refetchCb },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, badgesRes, perfRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, department, avatar_url"),
        supabase.from("achievement_badges").select("*").order("earned_at", { ascending: false }),
        supabase.from("performance_metrics").select("user_id, teaching_score, research_score, service_score"),
      ]);

      setProfiles(profilesRes.data || []);
      setAchievements(badgesRes.data || []);

      // Build avg perf map
      const pMap: Record<string, { total: number; count: number }> = {};
      for (const p of perfRes.data || []) {
        if (!pMap[p.user_id]) pMap[p.user_id] = { total: 0, count: 0 };
        pMap[p.user_id].total += ((p.teaching_score || 0) + (p.research_score || 0) + (p.service_score || 0)) / 3;
        pMap[p.user_id].count += 1;
      }
      const avgMap: Record<string, number> = {};
      for (const [uid, val] of Object.entries(pMap)) {
        avgMap[uid] = val.count > 0 ? Math.round(val.total / val.count) : 0;
      }
      setPerfMap(avgMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.user_id, p);
    return m;
  }, [profiles]);

  // Top performing faculty (by badge count + performance)
  const topFaculty: TopFaculty[] = useMemo(() => {
    const badgeCounts: Record<string, number> = {};
    for (const a of achievements) {
      badgeCounts[a.user_id] = (badgeCounts[a.user_id] || 0) + 1;
    }

    return profiles
      .map((p) => ({
        profile: p,
        badgeCount: badgeCounts[p.user_id] || 0,
        avgPerformance: perfMap[p.user_id] || 0,
      }))
      .filter((f) => f.badgeCount > 0 || f.avgPerformance > 0)
      .sort((a, b) => {
        const scoreA = a.badgeCount * 20 + a.avgPerformance;
        const scoreB = b.badgeCount * 20 + b.avgPerformance;
        return scoreB - scoreA;
      })
      .slice(0, 10);
  }, [profiles, achievements, perfMap]);

  const filteredAchievements = useMemo(() => {
    let list = achievements;
    if (filterFaculty !== "all") {
      list = list.filter((a) => a.user_id === filterFaculty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.badge_name.toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q) ||
          (profileMap.get(a.user_id)?.full_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [achievements, filterFaculty, searchQuery, profileMap]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleSave = async () => {
    if (!formData.userId || !formData.title.trim()) {
      toast({ title: "Error", description: "Faculty and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("achievement_badges").insert({
        user_id: formData.userId,
        badge_name: formData.title.trim(),
        badge_icon: formData.icon,
        description: formData.description.trim() || null,
        earned_at: new Date(formData.date).toISOString(),
      });
      if (error) throw error;
      toast({ title: "Achievement Added", description: `${formData.title} awarded successfully.` });
      setDialogOpen(false);
      setFormData({ userId: "", title: "", description: "", icon: "award", date: new Date().toISOString().split("T")[0] });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("achievement_badges").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Achievement Removed" });
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const summaryCards = [
    { label: "Total Achievements", value: achievements.length, icon: Award, color: "from-amber-500 to-amber-600" },
    {
      label: "Faculty Awarded",
      value: new Set(achievements.map((a) => a.user_id)).size,
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "This Month",
      value: achievements.filter((a) => {
        const d = new Date(a.earned_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      icon: Calendar,
      color: "from-green-500 to-green-600",
    },
    {
      label: "Top Performer",
      value: topFaculty[0]?.profile.full_name.split(" ")[0] || "N/A",
      icon: Crown,
      color: "from-purple-500 to-purple-600",
    },
  ];

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
          <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted-foreground">Award achievements and highlight top performing faculty</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Achievement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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

      <Tabs defaultValue="achievements" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="achievements">All Achievements</TabsTrigger>
          <TabsTrigger value="top">Top Performers</TabsTrigger>
        </TabsList>

        {/* All Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search achievements or faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterFaculty} onValueChange={setFilterFaculty}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by faculty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Faculty</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Achievement</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAchievements.map((a) => {
                    const profile = profileMap.get(a.user_id);
                    const IconComp = getIconComponent(a.badge_icon);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                                {getInitials(profile?.full_name || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground text-sm">{profile?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{profile?.department || "Unassigned"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <IconComp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="font-medium text-foreground text-sm">{a.badge_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {a.description || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(a.earned_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(a.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredAchievements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No achievements found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="top" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topFaculty.map((f, i) => {
              const rank = i + 1;
              const rankColors =
                rank === 1
                  ? "from-amber-400 to-amber-600 ring-amber-300"
                  : rank === 2
                  ? "from-slate-300 to-slate-500 ring-slate-200"
                  : rank === 3
                  ? "from-orange-400 to-orange-600 ring-orange-300"
                  : "from-primary/60 to-primary ring-primary/30";

              const userBadges = achievements.filter((a) => a.user_id === f.profile.user_id).slice(0, 4);

              return (
                <motion.div
                  key={f.profile.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="relative overflow-hidden">
                    {rank <= 3 && (
                      <div className="absolute top-3 right-3">
                        <div className={`bg-gradient-to-br ${rankColors} rounded-full h-8 w-8 flex items-center justify-center ring-2 ${rank <= 3 ? rankColors.split(" ")[2] : ""}`}>
                          <span className="text-white font-bold text-xs">#{rank}</span>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={f.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {getInitials(f.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{f.profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">{f.profile.department || "Unassigned"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{f.badgeCount}</p>
                          <p className="text-xs text-muted-foreground">Badges</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{f.avgPerformance}%</p>
                          <p className="text-xs text-muted-foreground">Performance</p>
                        </div>
                      </div>

                      {/* Badge preview */}
                      {userBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {userBadges.map((b) => {
                            const IC = getIconComponent(b.badge_icon);
                            return (
                              <Badge key={b.id} variant="secondary" className="text-xs gap-1 px-2 py-0.5">
                                <IC className="h-3 w-3" />
                                {b.badge_name}
                              </Badge>
                            );
                          })}
                          {achievements.filter((a) => a.user_id === f.profile.user_id).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{achievements.filter((a) => a.user_id === f.profile.user_id).length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {topFaculty.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No performance data available yet
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Achievement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Achievement</DialogTitle>
            <DialogDescription>Award an achievement badge to a faculty member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Faculty Member</Label>
              <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name} ({p.department || "Unassigned"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Outstanding Researcher"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the achievement"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_ICONS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        <span className="flex items-center gap-2">
                          <b.icon className="h-4 w-4" />
                          {b.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Award Achievement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Achievement</DialogTitle>
            <DialogDescription>Are you sure you want to remove this achievement? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AchievementManagement;
