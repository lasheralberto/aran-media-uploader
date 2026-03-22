
export interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'video';
}

export type UploadItemStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface UploadItemState {
  id: string;
  fileName: string;
  size: number;
  transferredBytes: number;
  progress: number;
  status: UploadItemStatus;
  attempts: number;
  error?: string;
}

export interface UploadBatchState {
  totalFiles: number;
  totalBytes: number;
  transferredBytes: number;
  progress: number;
  queuedFiles: number;
  activeFiles: number;
  processingFiles: number;
  completedFiles: number;
  failedFiles: number;
  maxConcurrency: number;
  items: Record<string, UploadItemState>;
}

export interface UploadBatchFailure {
  fileName: string;
  reason: string;
}

export interface UploadBatchSummary {
  totalFiles: number;
  totalBytes: number;
  successfulFiles: number;
  failedFiles: number;
  successful: string[];
  failed: UploadBatchFailure[];
}
