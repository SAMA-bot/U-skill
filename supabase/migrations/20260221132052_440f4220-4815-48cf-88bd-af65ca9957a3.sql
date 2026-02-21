
-- Create faculty_documents table for document upload & verification
CREATE TABLE public.faculty_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'certificate',
  document_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faculty_documents ENABLE ROW LEVEL SECURITY;

-- Faculty can view their own documents
CREATE POLICY "Users can view their own documents"
  ON public.faculty_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Faculty can upload their own documents
CREATE POLICY "Users can insert their own documents"
  ON public.faculty_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Faculty can delete their own pending documents
CREATE POLICY "Users can delete their own pending documents"
  ON public.faculty_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON public.faculty_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update documents (for verification)
CREATE POLICY "Admins can update all documents"
  ON public.faculty_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for faculty documents
INSERT INTO storage.buckets (id, name, public) VALUES ('faculty-documents', 'faculty-documents', false);

-- Storage policies for faculty-documents bucket
CREATE POLICY "Users can upload their own faculty documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'faculty-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own faculty documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'faculty-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all faculty documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'faculty-documents' AND public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_faculty_documents_updated_at
  BEFORE UPDATE ON public.faculty_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_documents;
