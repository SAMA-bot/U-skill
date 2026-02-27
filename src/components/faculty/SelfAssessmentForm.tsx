import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Star, Loader2, Save, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useToast } from "@/hooks/use-toast";

interface SelfAssessment {
  id?: string;
  teaching_rating: number;
  research_rating: number;
  service_rating: number;
  strengths: string;
  weaknesses: string;
  goals: string;
  additional_comments: string;
}

const RATING_LABELS = ["Poor", "Below Average", "Average", "Good", "Excellent"];

const RatingStars = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-foreground">{label}</Label>
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        {value > 0 ? RATING_LABELS[value - 1] : "Not rated"}
      </span>
    </div>
  </div>
);

const SelfAssessmentForm = () => {
  const { user } = useAuth();
  const { selectedYear } = useAcademicYear();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [form, setForm] = useState<SelfAssessment>({
    teaching_rating: 0,
    research_rating: 0,
    service_rating: 0,
    strengths: "",
    weaknesses: "",
    goals: "",
    additional_comments: "",
  });

  useEffect(() => {
    if (user) fetchExisting();
  }, [user, selectedYear]);

  const fetchExisting = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("self_assessments")
        .select("*")
        .eq("user_id", user.id)
        .eq("academic_year", selectedYear)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setForm({
          teaching_rating: data.teaching_rating,
          research_rating: data.research_rating,
          service_rating: data.service_rating,
          strengths: data.strengths || "",
          weaknesses: data.weaknesses || "",
          goals: data.goals || "",
          additional_comments: data.additional_comments || "",
        });
      } else {
        setExistingId(null);
        setForm({
          teaching_rating: 0,
          research_rating: 0,
          service_rating: 0,
          strengths: "",
          weaknesses: "",
          goals: "",
          additional_comments: "",
        });
      }
    } catch (err) {
      console.error("Error fetching self-assessment:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (form.teaching_rating === 0 || form.research_rating === 0 || form.service_rating === 0) {
      toast({
        title: "Incomplete ratings",
        description: "Please rate all three categories before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        academic_year: selectedYear,
        teaching_rating: form.teaching_rating,
        research_rating: form.research_rating,
        service_rating: form.service_rating,
        strengths: form.strengths.trim() || null,
        weaknesses: form.weaknesses.trim() || null,
        goals: form.goals.trim() || null,
        additional_comments: form.additional_comments.trim() || null,
      };

      if (existingId) {
        const { error } = await supabase
          .from("self_assessments")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("self_assessments")
          .insert(payload);
        if (error) throw error;
      }

      toast({
        title: existingId ? "Assessment updated" : "Assessment submitted",
        description: `Your self-assessment for ${selectedYear} has been saved.`,
      });
      fetchExisting();
    } catch (err: any) {
      console.error("Error saving self-assessment:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save assessment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Self-Assessment — {selectedYear}
            </CardTitle>
            <CardDescription>
              Evaluate your own performance across key areas
            </CardDescription>
          </div>
          {existingId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Submitted
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <RatingStars
              label="Teaching Effectiveness"
              value={form.teaching_rating}
              onChange={(v) => setForm((f) => ({ ...f, teaching_rating: v }))}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <RatingStars
              label="Research & Publications"
              value={form.research_rating}
              onChange={(v) => setForm((f) => ({ ...f, research_rating: v }))}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <RatingStars
              label="Service & Leadership"
              value={form.service_rating}
              onChange={(v) => setForm((f) => ({ ...f, service_rating: v }))}
            />
          </motion.div>
        </div>

        {/* Text Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Key Strengths</Label>
            <Textarea
              placeholder="What are your strongest areas this year?"
              value={form.strengths}
              onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Areas for Improvement</Label>
            <Textarea
              placeholder="Where do you see room for growth?"
              value={form.weaknesses}
              onChange={(e) => setForm((f) => ({ ...f, weaknesses: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Goals for Next Year</Label>
            <Textarea
              placeholder="What do you aim to achieve?"
              value={form.goals}
              onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Additional Comments</Label>
            <Textarea
              placeholder="Any other remarks..."
              value={form.additional_comments}
              onChange={(e) => setForm((f) => ({ ...f, additional_comments: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {existingId ? "Update Assessment" : "Submit Assessment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfAssessmentForm;
