import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquarePlus, Loader2, Star, Send, CheckCircle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FacultyProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  designation: string | null;
}

interface FeedbackEntry {
  id: string;
  faculty_id: string;
  faculty_name: string;
  rating: number;
  comment: string | null;
  category: string;
  created_at: string;
}

interface HodFeedbackSystemProps {
  department: string;
}

const CATEGORIES = [
  { value: "teaching", label: "Teaching" },
  { value: "research", label: "Research" },
  { value: "mentoring", label: "Mentoring" },
  { value: "collaboration", label: "Collaboration" },
  { value: "general", label: "General" },
];

const HodFeedbackSystem = ({ department }: HodFeedbackSystemProps) => {
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("general");
  const [comment, setComment] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, designation")
        .eq("department", department);

      const facultyProfiles = (profiles || []).filter((p) => p.user_id !== user?.id);
      setFacultyList(facultyProfiles);

      if (facultyProfiles.length > 0) {
        const facultyIds = facultyProfiles.map((f) => f.user_id);
        const facultyMap = Object.fromEntries(facultyProfiles.map((f) => [f.user_id, f]));

        const { data: feedback } = await supabase
          .from("faculty_feedback")
          .select("*")
          .in("faculty_id", facultyIds)
          .eq("reviewer_id", user?.id || "")
          .order("created_at", { ascending: false })
          .limit(20);

        setRecentFeedback(
          (feedback || []).map((fb) => ({
            ...fb,
            faculty_name: facultyMap[fb.faculty_id]?.full_name || "Unknown",
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [department, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!selectedFaculty || rating === 0) {
      toast({ title: "Please select a faculty member and rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("faculty_feedback").insert({
        faculty_id: selectedFaculty,
        reviewer_id: user!.id,
        rating,
        comment: comment.trim() || null,
        category,
      });

      if (error) throw error;

      toast({ title: "Feedback Submitted", description: "Your feedback has been recorded." });

      // Reset form
      setSelectedFaculty("");
      setRating(0);
      setComment("");
      setCategory("general");
      fetchData();
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const selectedFacultyProfile = facultyList.find((f) => f.user_id === selectedFaculty);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          Faculty Feedback System
        </h2>
        <p className="text-sm text-muted-foreground">
          Submit structured feedback for department faculty members
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Feedback Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit Feedback</CardTitle>
            <CardDescription>Rate and provide qualitative feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {facultyList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquarePlus className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No faculty members in your department</p>
              </div>
            ) : (
              <>
                {/* Faculty Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Select Faculty</label>
                  <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose faculty member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyList.map((f) => (
                        <SelectItem key={f.user_id} value={f.user_id}>
                          <div className="flex items-center gap-2">
                            <span>{f.full_name}</span>
                            {f.designation && (
                              <span className="text-xs text-muted-foreground">· {f.designation}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Star Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-0.5 transition-transform hover:scale-110"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
                    )}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Feedback & Recommendations</label>
                  <Textarea
                    placeholder="Write qualitative feedback, note strengths, areas for improvement, and recommend trainings..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedFaculty || rating === 0}
                  className="w-full gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Feedback
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Recent Feedback</CardTitle>
            <CardDescription>Feedback you've submitted for department faculty</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFeedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No feedback submitted yet</p>
                <p className="text-xs mt-1">Start by selecting a faculty member and providing a rating.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {recentFeedback.map((fb, idx) => (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{fb.faculty_name}</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">{fb.category}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= fb.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {fb.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{fb.comment}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {format(new Date(fb.created_at), "MMM d, yyyy")}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HodFeedbackSystem;
