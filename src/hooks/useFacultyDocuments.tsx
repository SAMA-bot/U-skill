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

  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const deleteDocument = async (docId: string) => {
    if (!user) return;
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    try {
      console.log("[deleteDocument] Soft deleting:", doc.document_url, "user:", user.id);

      // Step 1: Soft delete in DB (triggers audit log automatically)
      const { error } = await supabase
        .from("faculty_documents" as any)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        } as any)
        .eq("id", docId);

      if (error) throw error;

      // Step 2: Optimistically remove from UI
      setDocuments((prev) => prev.filter((d) => d.id !== docId));

      // Step 3: Show undo snackbar (5 seconds)
      const timer = setTimeout(async () => {
        // After 5s, permanently remove the storage file
        undoTimers.current.delete(docId);
        if (doc.document_url) {
          await supabase.storage.from("faculty-documents").remove([doc.document_url]);
          console.log("[deleteDocument] Storage file permanently removed");
        }
      }, 5000);

      undoTimers.current.set(docId, timer);

      sonnerToast("Document deleted", {
        description: `"${doc.title}" has been removed.`,
        action: {
          label: "Undo",
          onClick: async () => {
            // Cancel the permanent deletion timer
            const t = undoTimers.current.get(docId);
            if (t) {
              clearTimeout(t);
              undoTimers.current.delete(docId);
            }
            // Restore the document
            const { error: restoreError } = await supabase
              .from("faculty_documents" as any)
              .update({ deleted_at: null, deleted_by: null } as any)
              .eq("id", docId);

            if (restoreError) {
              console.error("[deleteDocument] Undo failed:", restoreError);
              sonnerToast.error("Failed to undo deletion");
              return;
            }
            // Re-add to UI
            setDocuments((prev) => [doc, ...prev]);
            sonnerToast.success("Document restored");
          },
        },
        duration: 5000,
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
