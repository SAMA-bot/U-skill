import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Clock, 
  User, 
  ExternalLink,
  BookOpen,
  Filter,
  Video,
  FileText,
  Play,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_hours: number | null;
  instructor_name: string | null;
  thumbnail_url: string | null;
  course_url: string | null;
  video_url: string | null;
  course_type: string;
  is_published: boolean;
}

const CoursesViewer = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const { toast } = useToast();

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "teaching", label: "Teaching & Pedagogy" },
    { value: "research", label: "Research & Publications" },
    { value: "technology", label: "Technology & Digital Skills" },
    { value: "leadership", label: "Leadership & Management" },
    { value: "communication", label: "Communication Skills" },
    { value: "general", label: "General Development" },
  ];

  // Initial fetch
  useEffect(() => {
    fetchCourses();
  }, []);

  // Realtime subscription for courses
  useRealtimeData({
    table: "courses",
    onInsert: (newCourse) => {
      if (newCourse.is_published) {
        setCourses((prev) => [newCourse, ...prev]);
        toast({
          title: "New course available!",
          description: `"${newCourse.title}" has been added.`,
        });
      }
    },
    onUpdate: (updatedCourse) => {
      setCourses((prev) => {
        // If course is now unpublished, remove it
        if (!updatedCourse.is_published) {
          return prev.filter((c) => c.id !== updatedCourse.id);
        }
        // If course exists, update it
        const exists = prev.find((c) => c.id === updatedCourse.id);
        if (exists) {
          return prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
        }
        // If course is newly published, add it
        return [updatedCourse, ...prev];
      });
    },
    onDelete: (deletedCourse) => {
      setCourses((prev) => prev.filter((c) => c.id !== deletedCourse.id));
    },
  });

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || course.category === categoryFilter;

    const matchesType =
      typeFilter === "all" || course.course_type === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const videoCourses = filteredCourses.filter(c => c.course_type === 'video');
  const regularCourses = filteredCourses.filter(c => c.course_type === 'regular');

  const getEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    // Direct video URL
    return url;
  };

  const isEmbeddable = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const handlePlayVideo = (course: Course) => {
    setSelectedCourse(course);
    setVideoModalOpen(true);
  };

  const getCategoryLabel = (value: string) => {
    return categories.find((c) => c.value === value)?.label || value;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      teaching: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      research: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      technology: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      leadership: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      communication: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
      general: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return colors[category] || colors.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderCourseCard = (course: Course, index: number) => (
    <motion.div
      key={course.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative group">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {course.course_type === 'video' ? (
              <Video className="h-12 w-12 text-muted-foreground" />
            ) : (
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge className={getCategoryColor(course.category)}>
            {getCategoryLabel(course.category)}
          </Badge>
          {course.course_type === 'video' && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <Video className="h-3 w-3 mr-1" />
              Video
            </Badge>
          )}
        </div>
        {course.course_type === 'video' && course.video_url && (
          <div 
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => handlePlayVideo(course)}
          >
            <div className="bg-white/90 rounded-full p-4">
              <Play className="h-8 w-8 text-primary fill-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground line-clamp-2">
          {course.title}
        </h3>
        
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {course.instructor_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{course.instructor_name}</span>
            </div>
          )}
          {course.duration_hours && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{course.duration_hours}h</span>
            </div>
          )}
        </div>

        {course.course_type === 'video' && course.video_url ? (
          <Button
            variant="default"
            className="w-full mt-2"
            onClick={() => handlePlayVideo(course)}
          >
            <Play className="h-4 w-4 mr-2" />
            Watch Video
          </Button>
        ) : course.course_url ? (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => window.open(course.course_url!, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Access Course
          </Button>
        ) : null}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Capacity Building Courses</h2>
        <p className="text-muted-foreground mt-1">
          Browse and access training courses to enhance your skills
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="regular">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Regular
              </div>
            </SelectItem>
            <SelectItem value="video">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            All ({filteredCourses.length})
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({videoCourses.length})
          </TabsTrigger>
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Courses ({regularCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No courses found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || categoryFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "No courses are available at the moment"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => renderCourseCard(course, index))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          {videoCourses.length === 0 ? (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No video courses found</h3>
              <p className="text-muted-foreground mt-1">
                Video courses will appear here when available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoCourses.map((course, index) => renderCourseCard(course, index))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="regular" className="mt-6">
          {regularCourses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No regular courses found</h3>
              <p className="text-muted-foreground mt-1">
                Regular courses will appear here when available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularCourses.map((course, index) => renderCourseCard(course, index))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {selectedCourse?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {selectedCourse?.video_url && (
              isEmbeddable(selectedCourse.video_url) ? (
                <div className="aspect-video">
                  <iframe
                    src={getEmbedUrl(selectedCourse.video_url)}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video">
                  <video
                    src={selectedCourse.video_url}
                    controls
                    className="w-full h-full rounded-lg"
                  />
                </div>
              )
            )}
            {selectedCourse?.description && (
              <p className="mt-4 text-muted-foreground">
                {selectedCourse.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {selectedCourse?.instructor_name && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{selectedCourse.instructor_name}</span>
                </div>
              )}
              {selectedCourse?.duration_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{selectedCourse.duration_hours} hours</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursesViewer;
