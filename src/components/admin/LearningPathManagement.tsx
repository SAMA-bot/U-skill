import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus, Pencil, Trash2, Loader2, BookOpen, GripVertical,
  Video, FileText, Link2, Type, ChevronRight, Eye, EyeOff,
  FolderPlus, FilePlus, Layers, Zap,
} from "lucide-react";

// Types
interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
}

interface LearningModule {
  id: string;
  path_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  sort_order: number;
}

interface LessonContentItem {
  id: string;
  lesson_id: string;
  content_type: string;
  title: string;
  text_content: string | null;
  video_url: string | null;
  document_url: string | null;
  external_url: string | null;
  sort_order: number;
}

const CONTENT_TYPE_OPTIONS = [
  { value: "text", label: "Text Explanation", icon: Type, color: "text-foreground" },
  { value: "platform_video", label: "Platform Video", icon: Video, color: "text-primary" },
  { value: "external_url", label: "External URL", icon: Link2, color: "text-info" },
  { value: "pdf", label: "PDF Document", icon: FileText, color: "text-destructive" },
];

const COLOR_OPTIONS = [
  { value: "primary", label: "Cyan" },
  { value: "accent", label: "Purple" },
  { value: "success", label: "Green" },
  { value: "destructive", label: "Red" },
  { value: "info", label: "Blue" },
];

export function LearningPathManagement() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [modules, setModules] = useState<Record<string, LearningModule[]>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [contentItems, setContentItems] = useState<Record<string, LessonContentItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

  // Dialog states
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingContent, setEditingContent] = useState<LessonContentItem | null>(null);
  const [currentPathId, setCurrentPathId] = useState<string>("");
  const [currentModuleId, setCurrentModuleId] = useState<string>("");
  const [currentLessonId, setCurrentLessonId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [pathForm, setPathForm] = useState({ title: "", description: "", icon: "book-open", color: "primary", is_published: false });
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", xp_reward: "10" });
  const [contentForm, setContentForm] = useState({ content_type: "text", title: "", text_content: "", external_url: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { fetchPaths(); }, []);

  const fetchPaths = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_paths")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setPaths((data || []) as LearningPath[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async (pathId: string) => {
    const { data, error } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("path_id", pathId)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setModules(prev => ({ ...prev, [pathId]: data as LearningModule[] }));
      // Fetch lessons for all modules
      for (const mod of data) {
        fetchLessons(mod.id);
      }
    }
  };

  const fetchLessons = async (moduleId: string) => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setLessons(prev => ({ ...prev, [moduleId]: data as Lesson[] }));
      for (const lesson of data) {
        fetchContent(lesson.id);
      }
    }
  };

  const fetchContent = async (lessonId: string) => {
    const { data, error } = await supabase
      .from("lesson_content")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setContentItems(prev => ({ ...prev, [lessonId]: data as LessonContentItem[] }));
    }
  };

  const handleExpandPath = (pathId: string) => {
    if (expandedPaths.includes(pathId)) {
      setExpandedPaths(prev => prev.filter(id => id !== pathId));
    } else {
      setExpandedPaths(prev => [...prev, pathId]);
      if (!modules[pathId]) fetchModules(pathId);
    }
  };

  // Upload helper
  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!user) return null;
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) throw new Error(`Failed to upload to ${bucket}`);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  // ---- PATH CRUD ----
  const openPathDialog = (path?: LearningPath) => {
    if (path) {
      setEditingPath(path);
      setPathForm({ title: path.title, description: path.description || "", icon: path.icon, color: path.color, is_published: path.is_published });
    } else {
      setEditingPath(null);
      setPathForm({ title: "", description: "", icon: "book-open", color: "primary", is_published: false });
    }
    setPathDialogOpen(true);
  };

  const savePath = async () => {
    if (!user || !pathForm.title.trim()) return;
    setSubmitting(true);
    try {
      const data = { ...pathForm, created_by: user.id, sort_order: paths.length };
      if (editingPath) {
        const { error } = await supabase.from("learning_paths").update(data).eq("id", editingPath.id);
        if (error) throw error;
        toast({ title: "Path updated" });
      } else {
        const { error } = await supabase.from("learning_paths").insert(data);
        if (error) throw error;
        toast({ title: "Path created" });
      }
      setPathDialogOpen(false);
      fetchPaths();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePath = async (id: string) => {
    if (!confirm("Delete this learning path and all its modules/lessons?")) return;
    const { error } = await supabase.from("learning_paths").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Path deleted" });
      fetchPaths();
    }
  };

  const togglePublish = async (path: LearningPath) => {
    const { error } = await supabase.from("learning_paths").update({ is_published: !path.is_published }).eq("id", path.id);
    if (!error) {
      toast({ title: path.is_published ? "Path unpublished" : "Path published" });
      fetchPaths();
    }
  };

  // ---- MODULE CRUD ----
  const openModuleDialog = (pathId: string, mod?: LearningModule) => {
    setCurrentPathId(pathId);
    if (mod) {
      setEditingModule(mod);
      setModuleForm({ title: mod.title, description: mod.description || "" });
    } else {
      setEditingModule(null);
      setModuleForm({ title: "", description: "" });
    }
    setModuleDialogOpen(true);
  };

  const saveModule = async () => {
    if (!moduleForm.title.trim()) return;
    setSubmitting(true);
    try {
      const mods = modules[currentPathId] || [];
      if (editingModule) {
        const { error } = await supabase.from("learning_modules").update({ title: moduleForm.title, description: moduleForm.description || null }).eq("id", editingModule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("learning_modules").insert({ path_id: currentPathId, title: moduleForm.title, description: moduleForm.description || null, sort_order: mods.length });
        if (error) throw error;
      }
      setModuleDialogOpen(false);
      fetchModules(currentPathId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteModule = async (modId: string, pathId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    const { error } = await supabase.from("learning_modules").delete().eq("id", modId);
    if (!error) fetchModules(pathId);
  };

  // ---- LESSON CRUD ----
  const openLessonDialog = (moduleId: string, lesson?: Lesson) => {
    setCurrentModuleId(moduleId);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({ title: lesson.title, description: lesson.description || "", xp_reward: lesson.xp_reward.toString() });
    } else {
      setEditingLesson(null);
      setLessonForm({ title: "", description: "", xp_reward: "10" });
    }
    setLessonDialogOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) return;
    setSubmitting(true);
    try {
      const lessonList = lessons[currentModuleId] || [];
      const data = { title: lessonForm.title, description: lessonForm.description || null, xp_reward: parseInt(lessonForm.xp_reward) || 10 };
      if (editingLesson) {
        const { error } = await supabase.from("lessons").update(data).eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert({ ...data, module_id: currentModuleId, sort_order: lessonList.length });
        if (error) throw error;
      }
      setLessonDialogOpen(false);
      fetchLessons(currentModuleId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm("Delete this lesson and all its content?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (!error) fetchLessons(moduleId);
  };

  // ---- CONTENT CRUD ----
  const openContentDialog = (lessonId: string, content?: LessonContentItem) => {
    setCurrentLessonId(lessonId);
    setVideoFile(null);
    setDocumentFile(null);
    setUploadProgress("");
    if (content) {
      setEditingContent(content);
      setContentForm({
        content_type: content.content_type,
        title: content.title,
        text_content: content.text_content || "",
        external_url: content.external_url || "",
      });
    } else {
      setEditingContent(null);
      setContentForm({ content_type: "text", title: "", text_content: "", external_url: "" });
    }
    setContentDialogOpen(true);
  };

  const saveContent = async () => {
    if (!contentForm.title.trim()) return;
    setSubmitting(true);
    try {
      let videoUrl: string | null = editingContent?.video_url || null;
      let documentUrl: string | null = editingContent?.document_url || null;

      if (contentForm.content_type === "platform_video" && videoFile) {
        setUploadProgress("Uploading video...");
        videoUrl = await uploadFile(videoFile, "course-videos");
      }
      if (contentForm.content_type === "pdf" && documentFile) {
        setUploadProgress("Uploading PDF...");
        documentUrl = await uploadFile(documentFile, "course-documents");
      }

      const items = contentItems[currentLessonId] || [];
      const data = {
        content_type: contentForm.content_type,
        title: contentForm.title,
        text_content: contentForm.content_type === "text" ? contentForm.text_content : null,
        video_url: contentForm.content_type === "platform_video" ? videoUrl : null,
        document_url: contentForm.content_type === "pdf" ? documentUrl : null,
        external_url: contentForm.content_type === "external_url" ? contentForm.external_url : null,
      };

      if (editingContent) {
        const { error } = await supabase.from("lesson_content").update(data).eq("id", editingContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lesson_content").insert({ ...data, lesson_id: currentLessonId, sort_order: items.length });
        if (error) throw error;
      }
      setContentDialogOpen(false);
      fetchContent(currentLessonId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  const deleteContent = async (contentId: string, lessonId: string) => {
    if (!confirm("Delete this content item?")) return;
    const { error } = await supabase.from("lesson_content").delete().eq("id", contentId);
    if (!error) fetchContent(lessonId);
  };

  const getContentIcon = (type: string) => {
    const opt = CONTENT_TYPE_OPTIONS.find(o => o.value === type);
    if (!opt) return <Type className="h-4 w-4" />;
    const Icon = opt.icon;
    return <Icon className={`h-4 w-4 ${opt.color}`} />;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Learning Path Management
            </CardTitle>
            <CardDescription>Create learning paths with modules, lessons, and multi-type content</CardDescription>
          </div>
          <Button onClick={() => openPathDialog()}>
            <Plus className="mr-2 h-4 w-4" /> New Path
          </Button>
        </CardHeader>
        <CardContent>
          {paths.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No learning paths yet</p>
              <p className="text-sm">Create your first learning path to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paths.map((path) => (
                <div key={path.id} className="border rounded-xl overflow-hidden">
                  {/* Path header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleExpandPath(path.id)}
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedPaths.includes(path.id) ? "rotate-90" : ""}`} />
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-${path.color}/10`}>
                      <BookOpen className={`h-4 w-4 text-${path.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{path.title}</span>
                        <Badge variant={path.is_published ? "default" : "secondary"} className="text-[10px]">
                          {path.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {path.description && <p className="text-xs text-muted-foreground truncate">{path.description}</p>}
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePublish(path)} title={path.is_published ? "Unpublish" : "Publish"}>
                        {path.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPathDialog(path)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePath(path.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: Modules */}
                  {expandedPaths.includes(path.id) && (
                    <div className="border-t px-4 py-3 space-y-3 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modules</span>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openModuleDialog(path.id)}>
                          <FolderPlus className="h-3 w-3 mr-1" /> Add Module
                        </Button>
                      </div>
                      {(modules[path.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No modules yet. Add one to start building.</p>
                      ) : (
                        <Accordion type="multiple" className="space-y-2">
                          {(modules[path.id] || []).map((mod) => (
                            <AccordionItem key={mod.id} value={mod.id} className="border rounded-lg overflow-hidden">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/30 text-sm">
                                <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                  <Layers className="h-4 w-4 text-accent shrink-0" />
                                  <span className="font-medium truncate">{mod.title}</span>
                                  <Badge variant="outline" className="text-[10px] ml-auto mr-2">
                                    {(lessons[mod.id] || []).length} lessons
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3 pt-1">
                                <div className="flex items-center gap-1 mb-2">
                                  <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => openModuleDialog(path.id, mod)}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-xs h-6 text-destructive" onClick={() => deleteModule(mod.id, path.id)}>
                                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                                  </Button>
                                  <div className="flex-1" />
                                  <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => openLessonDialog(mod.id)}>
                                    <FilePlus className="h-3 w-3 mr-1" /> Add Lesson
                                  </Button>
                                </div>

                                {/* Lessons */}
                                <div className="space-y-2 ml-2 border-l-2 border-border/50 pl-3">
                                  {(lessons[mod.id] || []).map((lesson) => (
                                    <div key={lesson.id} className="border rounded-lg p-2.5 bg-muted/20">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className="text-sm font-medium flex-1 truncate">{lesson.title}</span>
                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                                          {lesson.xp_reward} XP
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openLessonDialog(mod.id, lesson)}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteLesson(lesson.id, mod.id)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>

                                      {/* Content items */}
                                      <div className="space-y-1 ml-5">
                                        {(contentItems[lesson.id] || []).map((content) => (
                                          <div key={content.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1 px-2 rounded bg-card border border-border/30">
                                            {getContentIcon(content.content_type)}
                                            <span className="flex-1 truncate">{content.title}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openContentDialog(lesson.id, content)}>
                                              <Pencil className="h-2.5 w-2.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteContent(content.id, lesson.id)}>
                                              <Trash2 className="h-2.5 w-2.5" />
                                            </Button>
                                          </div>
                                        ))}
                                        <Button size="sm" variant="ghost" className="text-xs h-6 text-muted-foreground w-full justify-start" onClick={() => openContentDialog(lesson.id)}>
                                          <Plus className="h-3 w-3 mr-1" /> Add Content
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Path Dialog */}
      <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPath ? "Edit Learning Path" : "New Learning Path"}</DialogTitle>
            <DialogDescription>Define a learning path that organizes modules and lessons.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={pathForm.title} onChange={e => setPathForm({ ...pathForm, title: e.target.value })} placeholder="e.g., Web Development" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={pathForm.description} onChange={e => setPathForm({ ...pathForm, description: e.target.value })} placeholder="Brief description..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Color Theme</Label>
              <Select value={pathForm.color} onValueChange={v => setPathForm({ ...pathForm, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={pathForm.is_published} onCheckedChange={v => setPathForm({ ...pathForm, is_published: v })} />
              <Label>Publish immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPathDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePath} disabled={submitting || !pathForm.title.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPath ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Module" : "New Module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="e.g., HTML Basics" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveModule} disabled={submitting || !moduleForm.title.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingModule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "New Lesson"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="e.g., Introduction to Tags" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>XP Reward</Label>
              <Input type="number" min="1" value={lessonForm.xp_reward} onChange={e => setLessonForm({ ...lessonForm, xp_reward: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLesson} disabled={submitting || !lessonForm.title.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingLesson ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContent ? "Edit Content" : "Add Content"}</DialogTitle>
            <DialogDescription>Attach content to this lesson. Each lesson can have multiple content items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPE_OPTIONS.map(opt => {
                  const selected = contentForm.content_type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setContentForm({ ...contentForm, content_type: opt.value })}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-xs ${
                        selected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="h-4 w-4" />
                      <span className="font-medium text-center leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} placeholder="Content title" />
            </div>

            {contentForm.content_type === "text" && (
              <div className="space-y-2">
                <Label>Text Content *</Label>
                <Textarea value={contentForm.text_content} onChange={e => setContentForm({ ...contentForm, text_content: e.target.value })} rows={6} placeholder="Write the lesson explanation..." />
              </div>
            )}

            {contentForm.content_type === "platform_video" && (
              <div className="space-y-2">
                <Label>Video File *</Label>
                <Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                {editingContent?.video_url && !videoFile && <p className="text-xs text-muted-foreground">Current video will be kept.</p>}
              </div>
            )}

            {contentForm.content_type === "pdf" && (
              <div className="space-y-2">
                <Label>PDF File *</Label>
                <Input type="file" accept=".pdf" onChange={e => setDocumentFile(e.target.files?.[0] || null)} />
                {editingContent?.document_url && !documentFile && <p className="text-xs text-muted-foreground">Current PDF will be kept.</p>}
              </div>
            )}

            {contentForm.content_type === "external_url" && (
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input value={contentForm.external_url} onChange={e => setContentForm({ ...contentForm, external_url: e.target.value })} placeholder="https://..." />
              </div>
            )}

            {uploadProgress && <p className="text-sm text-primary animate-pulse">{uploadProgress}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveContent} disabled={submitting || !contentForm.title.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingContent ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
