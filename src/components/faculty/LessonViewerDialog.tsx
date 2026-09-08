import { useState, useEffect } from "react";
import {
  CheckCircle2, Video, FileText, Link2, Type,
  Star, Loader2, ArrowLeft, BookOpen, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getVideoSignedUrl, getDocumentSignedUrl } from "@/lib/storageUtils";

export interface ViewerLesson {
  id: string;
  title: string;
  xp_reward: number;
}

export interface LessonContentItem {
  id: string; lesson_id: string; content_type: string; title: string;
  text_content: string | null; video_url: string | null;
  document_url: string | null; external_url: string | null; sort_order: number;
}

export const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const h = parsed.hostname.toLowerCase();
    if (h.includes("youtube.com") && parsed.pathname === "/watch") {
      const v = parsed.searchParams.get("v");
      return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
    }
    if (h.includes("youtu.be")) return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (h.includes("youtube.com") && parsed.pathname.startsWith("/embed/")) return url;
    return null;
  } catch { return null; }
};

const getContentTypeIcon = (type: string) => {
  switch (type) {
    case "platform_video": return <Video className="h-3.5 w-3.5 text-primary" />;
    case "pdf": return <FileText className="h-3.5 w-3.5 text-destructive" />;
    case "external_url": return <Link2 className="h-3.5 w-3.5 text-info" />;
    case "text": return <Type className="h-3.5 w-3.5" />;
    default: return <BookOpen className="h-3.5 w-3.5" />;
  }
};

interface Props {
  lesson: ViewerLesson | null;
  isCompleted: boolean;
  onClose: () => void;
  onComplete: (lesson: ViewerLesson) => Promise<void> | void;
}

const LessonViewerDialog = ({ lesson, isCompleted, onClose, onComplete }: Props) => {
  const [content, setContent] = useState<LessonContentItem[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [viewedContentIds, setViewedContentIds] = useState<Set<string>>(new Set());
  const [autoCompleting, setAutoCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!lesson) { setContent([]); setSignedUrls({}); setViewedContentIds(new Set()); return; }

    const load = async () => {
      setLoadingMedia(true);
      const { data } = await supabase
        .from("lesson_content").select("*")
        .eq("lesson_id", lesson.id).order("sort_order", { ascending: true });
      const items = (data || []) as LessonContentItem[];
      const autoViewed = new Set<string>();
      const urls: Record<string, string> = {};
      for (const item of items) {
        if (item.content_type === "text") autoViewed.add(item.id);
        if (item.content_type === "platform_video" && item.video_url) {
          const yt = getYouTubeEmbedUrl(item.video_url);
          if (yt) urls[item.id] = yt;
          else {
            const signed = await getVideoSignedUrl(item.video_url);
            if (signed) urls[item.id] = signed;
          }
        }
        if (item.content_type === "pdf" && item.document_url) {
          const signed = await getDocumentSignedUrl(item.document_url);
          if (signed) urls[item.id] = signed;
        }
      }
      if (cancelled) return;
      setContent(items);
      setSignedUrls(urls);
      setViewedContentIds(autoViewed);
      setLoadingMedia(false);
    };
    load();
    return () => { cancelled = true; };
  }, [lesson?.id]);

  const markContentViewed = (contentId: string) => {
    setViewedContentIds(prev => new Set(prev).add(contentId));
  };

  useEffect(() => {
    if (!lesson || content.length === 0 || loadingMedia || autoCompleting || isCompleted) return;
    if (content.every(item => viewedContentIds.has(item.id))) {
      setAutoCompleting(true);
      Promise.resolve(onComplete(lesson)).finally(() => setAutoCompleting(false));
    }
  }, [viewedContentIds, content, lesson, loadingMedia, isCompleted]);

  return (
    <Dialog open={!!lesson} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground group" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
          </Button>
          <DialogTitle className="text-sm font-medium text-foreground truncate max-w-[60%]">
            {lesson?.title}
          </DialogTitle>
          <Badge variant="outline" className="text-primary border-primary/30 text-xs">
            <Star className="h-3 w-3 mr-1" /> {lesson?.xp_reward} XP
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingMedia ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No content in this lesson yet.</p>
            </div>
          ) : (
            content.map((item, i) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  {getContentTypeIcon(item.content_type)}
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                </div>

                {item.content_type === "text" && item.text_content && (
                  <div className="prose prose-sm max-w-none text-foreground bg-muted/30 rounded-lg p-4 border border-border/30">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{item.text_content}</div>
                  </div>
                )}

                {item.content_type === "platform_video" && (
                  signedUrls[item.id] ? (
                    getYouTubeEmbedUrl(item.video_url || "") ? (
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <iframe src={signedUrls[item.id]} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={item.title} onLoad={() => markContentViewed(item.id)} />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <video src={signedUrls[item.id]} controls className="w-full h-full" onPlay={() => markContentViewed(item.id)} />
                      </div>
                    )
                  ) : (
                    <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">Unable to load video</p>
                    </div>
                  )
                )}

                {item.content_type === "pdf" && (
                  signedUrls[item.id] ? (
                    <iframe src={signedUrls[item.id]} className="w-full h-[500px] rounded-lg border" title={item.title} onLoad={() => markContentViewed(item.id)} />
                  ) : (
                    <div className="h-[200px] rounded-lg bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">Unable to load document</p>
                    </div>
                  )
                )}

                {item.content_type === "external_url" && item.external_url && (
                  <div className="bg-info/5 border border-info/20 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate flex-1 mr-3">{item.external_url}</p>
                    <Button variant="outline" size="sm" onClick={() => { markContentViewed(item.id); window.open(item.external_url!, "_blank", "noopener,noreferrer"); }}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Link
                    </Button>
                  </div>
                )}

                {!isCompleted && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {viewedContentIds.has(item.id) ? (
                      <span className="text-[10px] text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Viewed</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Not viewed yet</span>
                    )}
                  </div>
                )}

                {i < content.length - 1 && <div className="border-t border-border/30 mt-4" />}
              </div>
            ))
          )}
        </div>

        {lesson && !isCompleted && (
          <div className="border-t border-border/40 bg-card/95 backdrop-blur-md px-4 py-3 space-y-2">
            {content.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {viewedContentIds.size}/{content.length} content items viewed
                </span>
                <Progress value={(viewedContentIds.size / content.length) * 100} className="h-1.5 w-24" />
              </div>
            )}
            {autoCompleting ? (
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium py-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Completing lesson...
              </div>
            ) : (
              <Button className="w-full" variant="outline" onClick={() => onComplete(lesson)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete (+{lesson.xp_reward} XP)
              </Button>
            )}
          </div>
        )}
        {lesson && isCompleted && (
          <div className="border-t border-border/40 bg-success/5 px-4 py-3 text-center">
            <span className="text-sm text-success font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Lesson Completed
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LessonViewerDialog;
