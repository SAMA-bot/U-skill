import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  Circle, 
  Trash2, 
  Play, 
  BookOpen, 
  FlaskConical, 
  Users, 
  Mic, 
  FileText, 
  Laptop, 
  HeartHandshake,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useActivities, ACTIVITY_TYPES, ActivityType, Activity } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";

const activityIcons: Record<ActivityType, typeof BookOpen> = {
  teaching: BookOpen,
  research: FlaskConical,
  workshop: Users,
  conference: Mic,
  publication: FileText,
  mentoring: Users,
  technology: Laptop,
  service: HeartHandshake,
};

const statusConfig = {
  pending: { 
    icon: Circle, 
    label: "Pending", 
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
  },
  in_progress: { 
    icon: Clock, 
    label: "In Progress", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  completed: { 
    icon: CheckCircle2, 
    label: "Completed", 
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
  },
};

export default function ActivityLogger() {
  const { activities, loading, stats, createActivity, completeActivity, startActivity, deleteActivity } = useActivities();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    activity_type: "" as ActivityType | "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.activity_type) return;

    setIsSubmitting(true);
    const success = await createActivity({
      title: formData.title,
      description: formData.description || undefined,
      activity_type: formData.activity_type as ActivityType,
    });

    if (success) {
      setFormData({ title: "", description: "", activity_type: "" });
      setIsOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleStatusChange = async (activity: Activity, newStatus: "in_progress" | "completed") => {
    if (newStatus === "completed") {
      await completeActivity(activity.id);
    } else {
      await startActivity(activity.id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Total Activities</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </motion.div>
      </div>

      {/* Add Activity Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Activity Log</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Log New Activity</DialogTitle>
                <DialogDescription>
                  Add a new activity to track your professional development. Completing activities will automatically update your skills and performance metrics.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Activity Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Completed research paper review"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Activity Type *</Label>
                  <Select
                    value={formData.activity_type}
                    onValueChange={(value) => setFormData({ ...formData, activity_type: value as ActivityType })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((type) => {
                        const Icon = activityIcons[type.value];
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formData.activity_type && (
                    <p className="text-xs text-muted-foreground">
                      {ACTIVITY_TYPES.find(t => t.value === formData.activity_type)?.description}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add details about this activity..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.title || !formData.activity_type}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Activity
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {activities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border rounded-lg p-8 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-2">No activities yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Start logging your professional activities to track your progress and build your skills.
              </p>
              <Button variant="outline" onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log Your First Activity
              </Button>
            </motion.div>
          ) : (
            activities.map((activity, index) => {
              const Icon = activityIcons[activity.activity_type as ActivityType] || BookOpen;
              const status = statusConfig[activity.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      activity.status === "completed" 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-primary/10"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        activity.status === "completed" 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-primary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={cn(
                            "font-medium",
                            activity.status === "completed" 
                              ? "text-muted-foreground line-through" 
                              : "text-foreground"
                          )}>
                            {activity.title}
                          </h4>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className={status.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-muted-foreground">
                          Created {formatDate(activity.created_at)}
                        </span>
                        {activity.completed_at && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Completed {formatDate(activity.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {activity.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(activity, "in_progress")}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {activity.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(activity, "completed")}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                      {activity.status !== "completed" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{activity.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteActivity(activity.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
