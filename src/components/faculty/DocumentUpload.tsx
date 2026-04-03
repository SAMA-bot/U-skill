import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useFacultyDocuments,
  DOCUMENT_TYPES,
  DocumentType,
  DocumentStatus,
} from "@/hooks/useFacultyDocuments";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";

const statusConfig: Record<
  DocumentStatus,
  { icon: typeof Clock; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  verified: {
    icon: CheckCircle2,
    label: "Verified",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function DocumentUpload() {
  const { documents, loading, uploadDocument, deleteDocument } =
    useFacultyDocuments();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("certificate");
  const prevDocsRef = useRef<typeof documents>([]);

  // Realtime toast when document status changes (approved/rejected by admin)
  useEffect(() => {
    if (prevDocsRef.current.length === 0) {
      prevDocsRef.current = documents;
      return;
    }

    for (const doc of documents) {
      const prev = prevDocsRef.current.find((d) => d.id === doc.id);
      if (prev && prev.status === "pending" && doc.status !== "pending") {
        const isApproved = doc.status === "verified";
        // Use dynamic import to avoid circular dependency
        import("@/hooks/use-toast").then(({ toast }) => {
          toast({
            title: isApproved ? "✅ Document Approved" : "❌ Document Rejected",
            description: isApproved
              ? `"${doc.title}" has been verified by admin.`
              : `"${doc.title}" was rejected${doc.rejection_reason ? `: ${doc.rejection_reason}` : "."}`,
            variant: isApproved ? "default" : "destructive",
          });
        });
      }
    }
    prevDocsRef.current = documents;
  }, [documents]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    const result = await uploadDocument(file, title, documentType);
    if (result) {
      setFile(null);
      setTitle("");
      setDocumentType("certificate");
      setIsOpen(false);
    }
    setUploading(false);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === "pending").length,
    verified: documents.filter((d) => d.status === "verified").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Verified</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.verified}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.rejected}
          </p>
        </motion.div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">My Documents</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleUpload}>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document for admin verification. Supported formats:
                  PDF, Word, images.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Document Title *</Label>
                  <Input
                    id="doc-title"
                    placeholder="e.g., AWS Certification 2024"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Document Type *</Label>
                  <Select
                    value={documentType}
                    onValueChange={(v) => setDocumentType(v as DocumentType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-file">File *</Label>
                  <Input
                    id="doc-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 10MB. PDF, Word, or image files.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || !file || !title}>
                  {uploading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {documents.length === 0 ? (
            <div className="bg-card border border-border rounded-lg">
              <SmartEmptyState
                icon={Upload}
                title="No documents uploaded yet"
                description="Upload certificates, publications, research papers, or other documents for admin verification and performance tracking."
                actionLabel="Upload Document"
                onAction={() => setIsOpen(true)}
              />
            </div>
          ) : (
            documents.map((doc, index) => {
              const status = statusConfig[doc.status as DocumentStatus] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg flex-shrink-0 bg-primary/10">
                      <FileIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {doc.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {DOCUMENT_TYPES.find(
                              (t) => t.value === doc.document_type
                            )?.label || doc.document_type}{" "}
                            · {doc.file_name}
                          </p>
                        </div>
                        <Badge variant="secondary" className={status.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Rejection reason */}
                      {doc.status === "rejected" && doc.rejection_reason && (
                        <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-700 dark:text-red-400">
                            <span className="font-medium">Reason: </span>
                            {doc.rejection_reason}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-muted-foreground">
                          Uploaded {formatDate(doc.created_at)}
                        </span>
                        {doc.reviewed_at && (
                          <span className="text-xs text-muted-foreground">
                            Reviewed {formatDate(doc.reviewed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {doc.status === "pending" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.title}"? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDocument(doc.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
