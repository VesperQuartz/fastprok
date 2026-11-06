import { HugeiconsIcon } from "@hugeicons/react";
import { FileAttachmentIcon } from "@hugeicons/core-free-icons";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { formatFileSize } from "./format";

export type ProformaDocumentMeta = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

const typeLabel = (mimeType: string) => {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "image/png") {
    return "PNG";
  }

  return "JPG";
};

export const ProformaAttachment = ({
  quoteId,
  document,
}: {
  quoteId: string;
  document: ProformaDocumentMeta;
}) => (
  <a
    href={`/api/documents/proforma/${quoteId}`}
    target="_blank"
    rel="noreferrer"
    className="mt-3 block w-fit max-w-full rounded-xl outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    aria-label={`View proforma invoice ${document.fileName}`}
  >
    <Attachment className="max-w-full">
      <AttachmentMedia>
        <HugeiconsIcon icon={FileAttachmentIcon} strokeWidth={1.8} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{document.fileName}</AttachmentTitle>
        <AttachmentDescription>
          Proforma invoice · {typeLabel(document.mimeType)} · {formatFileSize(document.sizeBytes)}
        </AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  </a>
);
