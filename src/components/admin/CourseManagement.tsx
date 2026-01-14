import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, BookOpen, Clock, User, ExternalLink, Video, FileText } from 'lucide-react';

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
  created_by: string;
  created_at: string;
  updated_at: string;
}

const COURSE_TYPES = [
  { value: 'regular', label: 'Regular Course', icon: FileText },
  { value: 'video', label: 'Video Course', icon: Video },
];

const COURSE_CATEGORIES = [
  'general',
  'teaching',
  'research',
  'technology',
  'leadership',
  'communication',
  'professional-development',
];

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    course_type: 'regular',
    duration_hours: '',
    instructor_name: '',
    course_url: '',
    video_url: '',
    is_published: false,
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      course_type: 'regular',
      duration_hours: '',
      instructor_name: '',
      course_url: '',
      video_url: '',
      is_published: false,
    });
    setThumbnailFile(null);
    setEditingCourse(null);
  };

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description || '',
        category: course.category,
        course_type: course.course_type || 'regular',
        duration_hours: course.duration_hours?.toString() || '',
        instructor_name: course.instructor_name || '',
        course_url: course.course_url || '',
        video_url: course.video_url || '',
        is_published: course.is_published,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const uploadThumbnail = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('course-thumbnails')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading thumbnail:', error);
      throw new Error('Failed to upload thumbnail');
    }

    const { data: urlData } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      let thumbnailUrl = editingCourse?.thumbnail_url || null;

      // Upload thumbnail if a new file is selected
      if (thumbnailFile) {
        thumbnailUrl = await uploadThumbnail(thumbnailFile);
      }

      const courseData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        course_type: formData.course_type,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        instructor_name: formData.instructor_name || null,
        course_url: formData.course_url || null,
        video_url: formData.video_url || null,
        thumbnail_url: thumbnailUrl,
        is_published: formData.is_published,
        created_by: user.id,
      };

      if (editingCourse) {
        // Update existing course
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) throw error;

        toast({
          title: 'Course Updated',
          description: 'The course has been updated successfully.',
        });
      } else {
        // Create new course
        const { error } = await supabase
          .from('courses')
          .insert(courseData);

        if (error) throw error;

        toast({
          title: 'Course Created',
          description: 'The course has been created successfully.',
        });
      }

      handleCloseDialog();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Error',
        description: 'Failed to save course',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Course Deleted',
        description: 'The course has been deleted successfully.',
      });

      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) throw error;

      toast({
        title: course.is_published ? 'Course Unpublished' : 'Course Published',
        description: `The course has been ${course.is_published ? 'unpublished' : 'published'}.`,
      });

      fetchCourses();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update course status',
        variant: 'destructive',
      });
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getCategoryBadgeStyle = (category: string) => {
    const styles: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      teaching: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      research: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      technology: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      leadership: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      communication: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'professional-development': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    };
    return styles[category] || styles.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Management
            </CardTitle>
            <CardDescription>
              Create and manage capacity building courses for faculty
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                <DialogDescription>
                  {editingCourse
                    ? 'Update the course details below.'
                    : 'Fill in the details to create a new course.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter course title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter course description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course_type">Course Type</Label>
                    <Select
                      value={formData.course_type}
                      onValueChange={(value) => setFormData({ ...formData, course_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={formData.duration_hours}
                      onChange={(e) =>
                        setFormData({ ...formData, duration_hours: e.target.value })
                      }
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructor">Instructor Name</Label>
                    <Input
                      id="instructor"
                      value={formData.instructor_name}
                      onChange={(e) =>
                        setFormData({ ...formData, instructor_name: e.target.value })
                      }
                      placeholder="Enter instructor name"
                    />
                  </div>
                </div>

                {formData.course_type === 'video' && (
                  <div className="space-y-2">
                    <Label htmlFor="video_url">Video URL *</Label>
                    <Input
                      id="video_url"
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      required={formData.course_type === 'video'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supports YouTube, Vimeo, or direct video links
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="course_url">Course URL</Label>
                  <Input
                    id="course_url"
                    type="url"
                    value={formData.course_url}
                    onChange={(e) => setFormData({ ...formData, course_url: e.target.value })}
                    placeholder="https://example.com/course"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail Image</Label>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  />
                  {editingCourse?.thumbnail_url && !thumbnailFile && (
                    <p className="text-sm text-muted-foreground">
                      Current thumbnail will be kept if no new image is selected.
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_published: checked })
                    }
                  />
                  <Label htmlFor="published">Publish course immediately</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search courses by title, category, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {courses.length === 0
                ? 'No courses found. Create your first course!'
                : 'No courses match your search.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="h-10 w-14 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{course.title}</p>
                            {course.course_url && (
                              <a
                                href={course.course_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                View Course <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className={getCategoryBadgeStyle(course.category)}>
                            {course.category.charAt(0).toUpperCase() +
                              course.category.slice(1).replace('-', ' ')}
                          </Badge>
                          <Badge variant="outline" className="w-fit text-xs">
                            {course.course_type === 'video' ? (
                              <><Video className="h-3 w-3 mr-1" /> Video</>
                            ) : (
                              <><FileText className="h-3 w-3 mr-1" /> Regular</>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.duration_hours ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {course.duration_hours}h
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {course.instructor_name ? (
                          <span className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            {course.instructor_name}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={course.is_published}
                          onCheckedChange={() => togglePublish(course)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(course)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(course.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
