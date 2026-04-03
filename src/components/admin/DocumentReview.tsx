import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileIcon,
  Loader2,
  Eye,
  Search,
  Filter,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/errorMessages";
import {
  DOCUMENT_TYPES,
  DocumentStatus,
} from "@/hooks/useFacultyDocuments";

interface DocumentWithProfile {
  id: string;
  user_id: string;
  title: string;
  document_type: string;
  document_url: string;
  file_name: string;
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Profile fields from join
  full_name?: string;
  email?: string;
  department?: string;
  avatar_url?: string;
}

const statusConfig: Record<
  string,
  { icon: typeof Clock; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.4)] dark:bg-[rgba(245,158,11,0.2)] dark:text-[#fbbf24]",
  },
  verified: {
    icon: CheckCircle2,
    label: "Verified",
    className: "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.4)] dark:bg-[rgba(34,197,94,0.2)] dark:text-[#4ade80]",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.4)] dark:bg-[rgba(239,68,68,0.2)] dark:text-[#f87171]",
  },
};

export default function DocumentReview() {
  const [documents, setDocuments] = useState<DocumentWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Fetch all documents
      const { data: docs, error: docsError } = await supabase
        .from("faculty_documents" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;

      // Fetch all profiles for the document owners
      const userIds = [...new Set((docs || []).map((d: any) => d.user_id))];
      const profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, department, avatar_url")
          .in("user_id", userIds);

        (profilesData || []).forEach((p) => {
          profileMap.set(p.user_id, p);
        });
      }

      setProfiles(profileMap);

      // Merge profile data into documents
      const docsWithProfile = (docs || []).map((d: any) => {
        const profile = profileMap.get(d.user_id);
        return {
          ...d,
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || "",
          department: profile?.department || "Unassigned",
          avatar_url: profile?.avatar_url || null,
        };
      });

      setDocuments(docsWithProfile);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc: DocumentWithProfile) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("faculty_documents" as any)
        .update({
          status: "verified",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        } as any)
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, status: "verified", reviewed_at: new Date().toISOString(), rejection_reason: null }
            : d
        )
      );

      toast({
        title: "✅ Document Approved",
        description: `"${doc.title}" has been verified. The faculty member will be notified.`,
      });
    } catch (error: any) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectionReason.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("faculty_documents" as any)
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        } as any)
        .eq("id", selectedDoc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? {
                ...d,
                status: "rejected",
                reviewed_at: new Date().toISOString(),
                rejection_reason: rejectionReason.trim(),
              }
            : d
        )
      );

      toast({
        title: "Document rejected",
        description: `"${selectedDoc.title}" has been rejected.`,
      });

      setRejectDialogOpen(false);
      setSelectedDoc(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (doc: DocumentWithProfile) => {
    setSelectedDoc(doc);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const openCommentDialog = (doc: DocumentWithProfile) => {
    setSelectedDoc(doc);
    setAdminComment("");
    setCommentDialogOpen(true);
  };

  const handleApproveWithComment = async () => {
    if (!selectedDoc) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("faculty_documents" as any)
        .update({
          status: "verified",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: adminComment.trim() || null,
        } as any)
        .eq("id", selectedDoc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? { ...d, status: "verified", reviewed_at: new Date().toISOString(), rejection_reason: adminComment.trim() || null }
            : d
        )
      );

      toast({
        title: "Document approved",
        description: `"${selectedDoc.title}" has been verified${adminComment ? " with comment" : ""}.`,
      });

      setCommentDialogOpen(false);
      setSelectedDoc(null);
      setAdminComment("");
    } catch (error: any) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePreview = async (doc: DocumentWithProfile) => {
    try {
      const { data, error } = await supabase.storage
        .from("faculty-documents")
        .createSignedUrl(doc.document_url.replace(/.*faculty-documents\//, ""), 300);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch {
      // Fallback: try using URL directly
      window.open(doc.document_url, "_blank");
    }
  };

  const handleDelete = async (doc: DocumentWithProfile) => {
    setDeletingId(doc.id);
    try {
      if (doc.document_url) {
        const filePath = doc.document_url.replace(/.*faculty-documents\//, "");
        console.log("[admin deleteDocument] file_path:", filePath);
        const { error: storageError } = await supabase.storage
          .from("faculty-documents")
          .remove([filePath]);
        if (storageError) {
          console.error("[admin deleteDocument] Storage error:", storageError);
          throw new Error("Failed to remove file from storage");
        }
      }
      const { error } = await supabase
        .from("faculty_documents" as any)
        .delete()
        .eq("id", doc.id);
      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast({ title: "Document deleted", description: `"${doc.title}" has been removed.` });
    } catch (error: any) {
      console.error("[admin deleteDocument] Error:", error);
      toast({ title: "Delete failed", description: getUserFriendlyError(error, "general"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // Get unique departments for filter
  const departments = [...new Set(documents.map((d) => d.department).filter(Boolean))] as string[];
  const documentTypes = [...new Set(documents.map((d) => d.document_type))];

  const filteredDocuments = documents.filter((doc) => {
    const matchesStatus =
      statusFilter === "all" || doc.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || doc.department === departmentFilter;
    const matchesType =
      typeFilter === "all" || doc.document_type === typeFilter;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDepartment && matchesType && matchesSearch;
  });

  const pendingCount = documents.filter((d) => d.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Document Review</h1>
        <p className="text-muted-foreground">
          Review and verify faculty-uploaded documents
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.15)] px-2 py-0.5 text-xs font-semibold text-[#f59e0b] dark:bg-[rgba(245,158,11,0.2)] dark:text-[#fbbf24]">
              {pendingCount} pending
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, name, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Doc Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const statusInfo = statusConfig[doc.status] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={doc.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                              {getInitials(doc.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {doc.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.department}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {doc.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)
                            ?.label || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusInfo.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {doc.status === "rejected" && doc.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                            {doc.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePreview(doc)}
                            title="Preview document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => openCommentDialog(doc)}
                                disabled={processing}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => openRejectDialog(doc)}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {doc.reviewed_at && `Reviewed ${formatDate(doc.reviewed_at)}`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{selectedDoc?.title}". The faculty
              member will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Document is illegible, missing signature, wrong format..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve with Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <DialogDescription>
              Approve "{selectedDoc?.title}". You can optionally add a comment for the faculty member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-comment">Admin Comment (optional)</Label>
              <Textarea
                id="admin-comment"
                placeholder="e.g., Verified and looks good. Please submit the original copy as well."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveWithComment}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
