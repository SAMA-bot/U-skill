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
import { Plus, Pencil, Trash2, Loader2, BookOpen, Clock, User, ExternalLink, Video, FileText, AlertTriangle, Building2, CalendarDays, Link2, FileIcon } from 'lucide-react';
import CourseEnrollmentStats from '@/components/admin/CourseEnrollmentStats';

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
  document_url: string | null;
  course_type: string;
  content_type: string;
  is_published: boolean;
  is_mandatory: boolean;
  department: string | null;
  training_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
}

const CONTENT_TYPES = [
  { value: 'platform_video', label: 'Platform Video', icon: Video, description: 'Upload a video file to the platform' },
  { value: 'external_url', label: 'External URL', icon: Link2, description: 'Link to YouTube, Udemy, or any external course' },
  { value: 'pdf_course', label: 'PDF Course', icon: FileIcon, description: 'Upload a PDF document' },
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

const getContentTypeIcon = (contentType: string) => {
  switch (contentType) {
    case 'platform_video': return '🎥';
    case 'external_url': return '🔗';
    case 'pdf_course': return '📄';
    default: return '📖';
  }
};

const getContentTypeLabel = (contentType: string) => {
  return CONTENT_TYPES.find(t => t.value === contentType)?.label || contentType;
};

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    content_type: 'platform_video',
    duration_hours: '',
    instructor_name: '',
    course_url: '',
    is_published: false,
    is_mandatory: false,
    department: '',
    training_date: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

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
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      content_type: 'platform_video',
      duration_hours: '',
      instructor_name: '',
      course_url: '',
      is_published: false,
      is_mandatory: false,
      department: '',
      training_date: '',
      tags: [],
    });
    setTagInput('');
    setThumbnailFile(null);
    setDocumentFile(null);
    setVideoFile(null);
    setUploadProgress('');
    setEditingCourse(null);
  };

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description || '',
        category: course.category,
        content_type: course.content_type || 'platform_video',
        duration_hours: course.duration_hours?.toString() || '',
        instructor_name: course.instructor_name || '',
        course_url: course.course_url || '',
        is_published: course.is_published,
        is_mandatory: course.is_mandatory || false,
        department: course.department || '',
        training_date: course.training_date || '',
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

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!user) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) throw new Error(`Failed to upload file to ${bucket}`);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation based on content_type
    if (formData.content_type === 'platform_video' && !videoFile && !editingCourse?.video_url) {
      toast({ title: 'Video Required', description: 'Please upload a video file for platform video courses.', variant: 'destructive' });
      return;
    }
    if (formData.content_type === 'external_url') {
      if (!formData.course_url.trim()) {
        toast({ title: 'URL Required', description: 'Please enter an external course URL.', variant: 'destructive' });
        return;
      }
      if (!isValidUrl(formData.course_url.trim())) {
        toast({ title: 'Invalid URL', description: 'Please enter a valid URL starting with http:// or https://.', variant: 'destructive' });
        return;
      }
    }
    if (formData.content_type === 'pdf_course' && !documentFile && !editingCourse?.document_url) {
      toast({ title: 'PDF Required', description: 'Please upload a PDF file for PDF courses.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      let thumbnailUrl = editingCourse?.thumbnail_url || null;
      let documentUrl = editingCourse?.document_url || null;
      let videoUrl = editingCourse?.video_url || null;

      if (thumbnailFile) {
        setUploadProgress('Uploading thumbnail...');
        thumbnailUrl = await uploadFile(thumbnailFile, 'course-thumbnails');
      }

      if (formData.content_type === 'pdf_course' && documentFile) {
        setUploadProgress('Uploading PDF...');
        documentUrl = await uploadFile(documentFile, 'course-documents');
      }

      if (formData.content_type === 'platform_video' && videoFile) {
        setUploadProgress('Uploading video (this may take a while)...');
        videoUrl = await uploadFile(videoFile, 'course-videos');
      }

      setUploadProgress('Saving course...');

      // Map content_type to legacy course_type for backward compatibility
      const courseType = formData.content_type === 'platform_video' ? 'video' : 'regular';

      const courseData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        course_type: courseType,
        content_type: formData.content_type,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        instructor_name: formData.instructor_name || null,
        course_url: formData.content_type === 'external_url' ? formData.course_url.trim() : null,
        document_url: formData.content_type === 'pdf_course' ? documentUrl : null,
        video_url: formData.content_type === 'platform_video' ? videoUrl : null,
        thumbnail_url: thumbnailUrl,
        is_published: formData.is_published,
        is_mandatory: formData.is_mandatory,
        department: formData.department || null,
        training_date: formData.training_date || null,
        created_by: user.id,
      };

      if (editingCourse) {
        const { error } = await supabase.from('courses').update(courseData).eq('id', editingCourse.id);
        if (error) throw error;
        toast({ title: 'Course Updated', description: 'The course has been updated successfully.' });
      } else {
        const { error } = await supabase.from('courses').insert(courseData);
        if (error) throw error;
        toast({ title: 'Course Created', description: 'The course has been created successfully.' });
      }

      handleCloseDialog();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      toast({ title: 'Error', description: 'Failed to save course', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
      toast({ title: 'Course Deleted', description: 'The course has been deleted successfully.' });
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' });
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const { error } = await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id);
      if (error) throw error;
      toast({ title: course.is_published ? 'Course Unpublished' : 'Course Published', description: `The course has been ${course.is_published ? 'unpublished' : 'published'}.` });
      fetchCourses();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({ title: 'Error', description: 'Failed to update course status', variant: 'destructive' });
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
      general: 'bg-muted text-muted-foreground',
      teaching: 'bg-primary/10 text-primary',
      research: 'bg-info/10 text-info',
      technology: 'bg-success/10 text-success',
      leadership: 'bg-accent/10 text-accent-foreground',
      communication: 'bg-destructive/10 text-destructive',
      'professional-development': 'bg-primary/10 text-primary',
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
            <CardDescription>Create and manage capacity building courses for faculty</CardDescription>
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
                  {editingCourse ? 'Update the course details below.' : 'Fill in the details to create a new course.'}
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

                {/* Content Type Selection */}
                <div className="space-y-2">
                  <Label>Content Type *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTENT_TYPES.map((type) => {
                      const isSelected = formData.content_type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, content_type: type.value })}
                          className={`
                            flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all
                            ${isSelected
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'}
                          `}
                        >
                          <type.icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {CONTENT_TYPES.find(t => t.value === formData.content_type)?.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {COURSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                      placeholder="e.g., 10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instructor">Instructor Name</Label>
                    <Input
                      id="instructor"
                      value={formData.instructor_name}
                      onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                      placeholder="Enter instructor name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Assign to Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="training_date">Training Date</Label>
                  <Input
                    id="training_date"
                    type="date"
                    value={formData.training_date}
                    onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                  />
                </div>

                {/* Conditional content fields */}
                {formData.content_type === 'platform_video' && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <Label htmlFor="video_file" className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Video File *
                    </Label>
                    <Input
                      id="video_file"
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    />
                    {editingCourse?.video_url && !videoFile && (
                      <p className="text-sm text-muted-foreground">Current video will be kept if no new file is selected.</p>
                    )}
                    <p className="text-xs text-muted-foreground">Upload MP4, WebM, or other video formats</p>
                  </div>
                )}

                {formData.content_type === 'external_url' && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <Label htmlFor="course_url" className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-info" />
                      External Course URL *
                    </Label>
                    <Input
                      id="course_url"
                      type="url"
                      value={formData.course_url}
                      onChange={(e) => setFormData({ ...formData, course_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... or https://udemy.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste a YouTube, Vimeo, Udemy, or any external course link
                    </p>
                  </div>
                )}

                {formData.content_type === 'pdf_course' && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <Label htmlFor="document_file" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-destructive" />
                      PDF Document *
                    </Label>
                    <Input
                      id="document_file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    />
                    {editingCourse?.document_url && !documentFile && (
                      <p className="text-sm text-muted-foreground">Current document will be kept if no new file is selected.</p>
                    )}
                    <p className="text-xs text-muted-foreground">Upload a PDF file</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  />
                  {editingCourse?.thumbnail_url && !thumbnailFile && (
                    <p className="text-sm text-muted-foreground">Current thumbnail will be kept if no new image is selected.</p>
                  )}
                </div>

                {uploadProgress && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch id="published" checked={formData.is_published} onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })} />
                    <Label htmlFor="published">Publish course immediately</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="mandatory" checked={formData.is_mandatory} onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })} />
                    <Label htmlFor="mandatory" className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                      Mark as mandatory training
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
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
              {courses.length === 0 ? 'No courses found. Create your first course!' : 'No courses match your search.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Enrolled</TableHead>
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
                            <img src={course.thumbnail_url} alt={course.title} className="h-10 w-14 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium">{course.title}</p>
                              {course.is_mandatory && (
                                <Badge className="bg-accent/10 text-accent-foreground text-[10px] px-1.5 py-0">Mandatory</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className={getCategoryBadgeStyle(course.category)}>
                            {course.category.charAt(0).toUpperCase() + course.category.slice(1).replace('-', ' ')}
                          </Badge>
                          <Badge variant="outline" className="w-fit text-xs">
                            {getContentTypeIcon(course.content_type)} {getContentTypeLabel(course.content_type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {course.duration_hours ? (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{course.duration_hours}h</span>
                          ) : null}
                          {course.instructor_name && (
                            <span className="flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" />{course.instructor_name}</span>
                          )}
                          {course.training_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(course.training_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.department ? (
                          <span className="flex items-center gap-1 text-sm"><Building2 className="h-3 w-3 text-muted-foreground" />{course.department}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">All</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CourseEnrollmentStats courseId={course.id} courseTitle={course.title} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={course.is_published} onCheckedChange={() => togglePublish(course)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(course)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)} className="text-destructive hover:text-destructive">
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
