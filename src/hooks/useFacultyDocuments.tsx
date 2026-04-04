import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorMessages";
import { useRealtimeData } from "@/hooks/useRealtimeData";

export type DocumentStatus = "pending" | "verified" | "rejected";
export type DocumentType = "certificate" | "publication" | "qualification" | "training" | "other";

export interface FacultyDocument {
  id: string;
  user_id: string;
  title: string;
  document_type: DocumentType;
  document_url: string;
  file_name: string;
  status: DocumentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "certificate", label: "Certificate" },
  { value: "publication", label: "Publication" },
  { value: "qualification", label: "Qualification" },
  { value: "training", label: "Training Document" },
  { value: "other", label: "Other" },
];

export const useFacultyDocuments = (allUsers?: boolean) => {
  const [documents, setDocuments] = useState<FacultyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("faculty_documents" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as unknown as FacultyDocument[]);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Realtime subscription for document updates (e.g., admin approvals)
  useRealtimeData({
    table: "faculty_documents" as any,
    userId: user?.id,
    onUpdate: (updated) => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, ...updated } as FacultyDocument : d))
      );
    },
    onInsert: (inserted) => {
      setDocuments((prev) => {
        if (prev.some((d) => d.id === inserted.id)) return prev;
        return [inserted as unknown as FacultyDocument, ...prev];
      });
    },
    onDelete: (deleted) => {
      setDocuments((prev) => prev.filter((d) => d.id !== deleted.id));
    },
  });

  const uploadDocument = async (
    file: File,
    title: string,
    documentType: DocumentType
  ) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("faculty-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("faculty-documents")
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("faculty_documents" as any)
        .insert({
          user_id: user.id,
          title,
          document_type: documentType,
          document_url: filePath,
          file_name: file.name,
          status: "pending",
        } as any)
        .select()
        .single();

      if (error) throw error;

      setDocuments((prev) => [data as unknown as FacultyDocument, ...prev]);
      toast({
        title: "Document uploaded",
        description: "Your document has been submitted for verification.",
      });
      return data;
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      const doc = documents.find((d) => d.id === docId);
      const filePath = doc?.document_url;

      console.log("[deleteDocument] file_path:", filePath, "user:", user?.id);

      // Step 1: Delete file from storage first
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("faculty-documents")
          .remove([filePath]);

        if (storageError) {
          console.error("[deleteDocument] Storage delete failed:", storageError);
          throw new Error("Failed to remove file from storage");
        }
        console.log("[deleteDocument] Storage file removed successfully");
      }

      // Step 2: Delete DB record only after storage succeeds
      const { error } = await supabase
        .from("faculty_documents" as any)
        .delete()
        .eq("id", docId);

      if (error) throw error;

      console.log("[deleteDocument] DB record removed successfully");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
    } catch (error: any) {
      console.error("[deleteDocument] Error:", error);
      toast({
        title: "Delete failed",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
    }
  };

  const reviewDocument = async (
    docId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) => {
    if (!user) return;

    try {
      const updateData: any = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? rejectionReason : null,
      };

      const { error } = await supabase
        .from("faculty_documents" as any)
        .update(updateData)
        .eq("id", docId);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, ...updateData } : d
        )
      );

      toast({
        title: status === "verified" ? "Document approved" : "Document rejected",
        description:
          status === "verified"
            ? "The document has been verified successfully."
            : "The document has been rejected.",
      });
    } catch (error: any) {
      console.error("Error reviewing document:", error);
      toast({
        title: "Review failed",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
    }
  };

  return {
    documents,
    loading,
    uploadDocument,
    deleteDocument,
    reviewDocument,
    refetch: fetchDocuments,
  };
};
