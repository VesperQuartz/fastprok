import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice01Icon, Upload01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "./format";
import { ProformaAttachment, type ProformaDocumentMeta } from "./proforma-attachment";

const MAX_BYTES = 5 * 1024 * 1024;

const validate = (file: File) => {
  if (file.size > MAX_BYTES) {
    return "Files must be 5 megabytes or smaller.";
  }

  const allowed = ["application/pdf", "image/png", "image/jpeg"];

  if (file.type && !allowed.includes(file.type)) {
    return "Use a PDF, PNG, or JPG file.";
  }

  return null;
};

export const ProformaCard = ({
  requestId,
  quoteId,
  canUpload,
  document,
}: {
  requestId: string;
  quoteId: string | null;
  canUpload: boolean;
  document: ProformaDocumentMeta | null;
}) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Choose a file first.");
      return;
    }

    const invalid = validate(file);

    if (invalid) {
      setError(invalid);
      return;
    }

    const body = new FormData();
    body.append("file", file);

    setError(null);
    setIsUploading(true);

    try {
      const response = await fetch(`/api/vendor/requests/${requestId}/proforma`, {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "The file could not be uploaded.");
      }

      setFile(null);
      setInputKey((current) => current + 1);
      await queryClient.invalidateQueries();
      toast.success(
        document ? "Proforma invoice replaced." : "Proforma invoice attached to your quote.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The file could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <HugeiconsIcon icon={Invoice01Icon} strokeWidth={1.8} className="size-4" />
          Proforma invoice
          <Badge variant="outline" className="rounded-full font-normal text-[11px]">
            Optional
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-xs text-pretty">
          PDF, PNG, or JPG up to 5 megabytes. The buyer sees it alongside your quote.
        </p>

        {document && quoteId ? <ProformaAttachment quoteId={quoteId} document={document} /> : null}

        {canUpload ? (
          <form onSubmit={upload} className="space-y-3">
            <Input
              key={inputKey}
              type="file"
              aria-label="Choose a proforma invoice file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="h-auto py-1.5"
              onChange={(event) => {
                const next = event.target.files?.item(0) ?? null;
                setFile(next);
                setError(next ? validate(next) : null);
              }}
            />
            {file ? (
              <p className="text-muted-foreground text-xs">
                {file.name} · {formatFileSize(file.size)}
              </p>
            ) : null}
            {error ? <p className="text-red-600 text-xs">{error}</p> : null}
            <Button type="submit" size="sm" className="h-11 sm:h-8" disabled={isUploading || !file}>
              <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
              {isUploading ? "Uploading…" : document ? "Replace proforma" : "Attach proforma"}
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">
            {document
              ? "Uploads are closed for this request."
              : "Save your quote first, then attach the proforma."}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
