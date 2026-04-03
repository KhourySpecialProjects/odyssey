export interface ImportSection {
  id: string;
  title: string;
  markdownContent: string;
  sourceInfo: string;
}

export interface ImportResult {
  sections: ImportSection[];
  fileName: string;
  fileType: "pdf" | "pptx";
  warnings: string[];
}

export interface ImportImage {
  id: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
}
