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
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  verified: {
    icon: CheckCircle2,
    label: "Verified",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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
        title: "Document approved",
        description: `"${doc.title}" has been verified.`,
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

  const filteredDocuments = documents.filter((doc) => {
    const matchesStatus =
      statusFilter === "all" || doc.status === statusFilter;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              {pendingCount} pending
            </Badge>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
                        <Badge variant="secondary" className={statusInfo.className}>
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
                        {doc.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => handleApprove(doc)}
                              disabled={processing}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => openRejectDialog(doc)}
                              disabled={processing}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {doc.reviewed_at && `Reviewed ${formatDate(doc.reviewed_at)}`}
                          </span>
                        )}
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
    </div>
  );
}
