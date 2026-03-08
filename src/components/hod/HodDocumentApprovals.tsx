import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText, CheckCircle, XCircle, Clock, Loader2, ExternalLink, Eye,
  FileCheck, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DocWithFaculty {
  id: string;
  user_id: string;
  title: string;
  document_type: string;
  document_url: string;
  file_name: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  faculty_name: string;
  avatar_url: string | null;
}

interface HodDocumentApprovalsProps {
  department: string;
}

const HodDocumentApprovals = ({ department }: HodDocumentApprovalsProps) => {
  const [documents, setDocuments] = useState<DocWithFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedDoc, setSelectedDoc] = useState<DocWithFaculty | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: faculty } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("department", department);

      if (!faculty || faculty.length === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      const facultyIds = faculty.map((f) => f.user_id);
      const facultyMap = Object.fromEntries(
        faculty.map((f) => [f.user_id, f])
      );

      let query = supabase
        .from("faculty_documents")
        .select("*")
        .in("user_id", facultyIds)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: docs } = await query;

      setDocuments(
        (docs || []).map((d) => ({
          ...d,
          faculty_name: facultyMap[d.user_id]?.full_name || "Unknown",
          avatar_url: facultyMap[d.user_id]?.avatar_url || null,
        }))
      );
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, [department, statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleReview = async (docId: string, newStatus: "verified" | "rejected") => {
    if (newStatus === "rejected" && !rejectReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("faculty_documents")
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: newStatus === "rejected" ? rejectReason : null,
        })
        .eq("id", docId);

      if (error) throw error;

      toast({
        title: newStatus === "verified" ? "Document Approved" : "Document Rejected",
        description: `Document has been ${newStatus}.`,
      });
      setSelectedDoc(null);
      setRejectReason("");
      fetchDocuments();
    } catch (err) {
      console.error("Error reviewing document:", err);
      toast({ title: "Error", description: "Failed to update document.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const statusCounts = {
    pending: documents.length,
    verified: 0,
    rejected: 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "verified":
        return <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-300 dark:text-red-400 dark:border-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Document Approvals
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and approve documents submitted by department faculty
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm font-medium">No {statusFilter !== "all" ? statusFilter : ""} documents found</p>
              <p className="text-xs">
                {statusFilter === "pending"
                  ? "All documents have been reviewed!"
                  : "Documents will appear here when faculty submit them."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc, idx) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={doc.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(doc.faculty_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{doc.faculty_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground max-w-[200px] truncate">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {doc.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => handleReview(doc.id, "verified")}
                              disabled={processing}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setSelectedDoc(doc)}
                              disabled={processing}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => { setSelectedDoc(null); setRejectReason(""); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Submitted by {selectedDoc?.faculty_name}
            </DialogDescription>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Title</span>
                  <p className="font-medium text-foreground">{selectedDoc.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium text-foreground capitalize">{selectedDoc.document_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">File</span>
                  <p className="font-medium text-foreground truncate">{selectedDoc.file_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted</span>
                  <p className="font-medium text-foreground">
                    {format(new Date(selectedDoc.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={selectedDoc.document_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View Document
                </a>
              </Button>

              {selectedDoc.status === "pending" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Rejection Reason (required if rejecting)
                    </label>
                    <Textarea
                      placeholder="Explain why this document is being rejected..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleReview(selectedDoc.id, "rejected")}
                      disabled={processing || !rejectReason.trim()}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleReview(selectedDoc.id, "verified")}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                  </DialogFooter>
                </>
              )}

              {selectedDoc.status === "rejected" && selectedDoc.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Rejection Reason
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedDoc.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HodDocumentApprovals;
