import type { Dispatch, SetStateAction } from 'react';
import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  list,
  deleteObject,
  uploadBytes,
  getBlob,
  type UploadTaskSnapshot,
  type StorageReference,
  type ListResult,
  type UploadMetadata
} from "firebase/storage";

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

import {
  MediaFile,
  UploadBatchState,
  UploadBatchSummary,
  UploadItemState,
  UploadItemStatus,
} from '../types';

// TODO: Add your Firebase project's configuration here.
// You can get this from your project's settings in the Firebase console.
// IMPORTANT: For security, it is highly recommended to use environment variables
// for this sensitive information, especially in a production environment.
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdLbY3STRARMEbN-zHuQvMD8Fi9D54Lec",
  authDomain: "aran-boda-c39d3.firebaseapp.com",
  projectId: "aran-boda-c39d3",
  storageBucket: "aran-boda-c39d3.firebasestorage.app",
  messagingSenderId: "339208458993",
  appId: "1:339208458993:web:3a4a06e08143e1e3254f50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const ai = new GoogleGenAI({
  apiKey: "AIzaSyBHoBJ_a8NHjdBulMJXnXnFpKbaoLO6qH4"
});

const MAX_PARALLEL_UPLOADS = 3;
const MAX_UPLOAD_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 1500;
const RETRYABLE_STORAGE_ERROR_CODES = new Set([
  'storage/canceled',
  'storage/invalid-checksum',
  'storage/retry-limit-exceeded',
  'storage/server-file-wrong-size',
  'storage/unknown',
]);

interface UploadQueueEntry {
  id: string;
  file: File;
  fileName: string;
  size: number;
}

interface UploadProgressUpdate {
  status?: UploadItemStatus;
  progress?: number;
  transferredBytes?: number;
  totalBytes?: number;
  attempts?: number;
  error?: string;
}

const sanitizeFileName = (name: string) => name.replace(/[\/\\#?]/g, '_');

const buildStoredFileName = (name: string) => `${Number.MAX_SAFE_INTEGER - Date.now()}-${sanitizeFileName(name)}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPreferredUploadConcurrency = (): number => {
  if (typeof navigator === 'undefined') {
    return MAX_PARALLEL_UPLOADS;
  }

  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number };
  }).connection;

  if (!connection) {
    return MAX_PARALLEL_UPLOADS;
  }

  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return 1;
  }

  if (connection.effectiveType === '3g' || (connection.downlink ?? 0) < 5) {
    return 2;
  }

  return MAX_PARALLEL_UPLOADS;
};

const isRetryableUploadError = (error: unknown): boolean => {
  if (!(error instanceof Error) && typeof error !== 'object') {
    return false;
  }

  const storageError = error as { code?: string };
  return !!storageError.code && RETRYABLE_STORAGE_ERROR_CODES.has(storageError.code);
};

const createInitialUploadItemState = (entry: UploadQueueEntry): UploadItemState => ({
  id: entry.id,
  fileName: entry.fileName,
  size: entry.size,
  transferredBytes: 0,
  progress: 0,
  status: 'queued',
  attempts: 0,
});

const recalculateBatchState = (state: UploadBatchState): UploadBatchState => {
  const items = Object.values(state.items);
  const transferredBytes = items.reduce((total, item) => total + item.transferredBytes, 0);
  const totalBytes = state.totalBytes || items.reduce((total, item) => total + item.size, 0);
  const progress = totalBytes > 0 ? Math.min(100, (transferredBytes / totalBytes) * 100) : 0;

  return {
    ...state,
    totalBytes,
    transferredBytes,
    progress,
    queuedFiles: items.filter(item => item.status === 'queued').length,
    activeFiles: items.filter(item => item.status === 'uploading').length,
    processingFiles: items.filter(item => item.status === 'processing').length,
    completedFiles: items.filter(item => item.status === 'completed').length,
    failedFiles: items.filter(item => item.status === 'failed').length,
  };
};

const createInitialBatchState = (entries: UploadQueueEntry[], maxConcurrency: number): UploadBatchState => {
  const items = entries.reduce<Record<string, UploadItemState>>((accumulator, entry) => {
    accumulator[entry.id] = createInitialUploadItemState(entry);
    return accumulator;
  }, {});

  return recalculateBatchState({
    totalFiles: entries.length,
    totalBytes: entries.reduce((total, entry) => total + entry.size, 0),
    transferredBytes: 0,
    progress: 0,
    queuedFiles: entries.length,
    activeFiles: 0,
    processingFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    maxConcurrency,
    items,
  });
};

const updateUploadItem = (
  setUploadState: Dispatch<SetStateAction<UploadBatchState | null>>,
  itemId: string,
  updater: (current: UploadItemState) => UploadItemState,
) => {
  setUploadState(previousState => {
    if (!previousState) {
      return previousState;
    }

    const currentItem = previousState.items[itemId];
    if (!currentItem) {
      return previousState;
    }

    const nextItem = updater(currentItem);
    if (nextItem === currentItem) {
      return previousState;
    }

    return recalculateBatchState({
      ...previousState,
      items: {
        ...previousState.items,
        [itemId]: nextItem,
      },
    });
  });
};

// Helper to convert Firebase Storage reference to base64
const storageRefToBase64 = async (storageRef: StorageReference): Promise<string> => {
    try {
        console.log('Getting blob from Firebase Storage reference:', storageRef.fullPath);
        
        // Use Firebase Storage's native getBlob method
        const blob = await getBlob(storageRef);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (!result) {
                    reject(new Error('FileReader result is null'));
                    return;
                }
                // Extract base64 data (remove data:image/...;base64, prefix)
                const base64Data = result.split(',')[1];
                if (!base64Data) {
                    reject(new Error('Failed to extract base64 data from result'));
                    return;
                }
                console.log('Successfully converted to base64, length:', base64Data.length);
                resolve(base64Data);
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(error);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error in storageRefToBase64:', error);
        throw error;
    }
};

export async function classifyImage(
  fileName: string,
  userId: string,
  mimeType: string,
): Promise<string | null> {
  try {
    
    // Create storage reference directly
    const fileRef = ref(storage, `feedPosts/${userId}/${fileName}`);
    const base64ImageData = await storageRefToBase64(fileRef);

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64ImageData,
      },
    };

    const textPart = {
      text: "Analyze this image from a wedding and classify it into one of the following three categories: 'Church', 'Celebration', or 'Party'. Your response must be a JSON object with a single 'category' key, like {\"category\": \"CATEGORY_NAME\"}. Only one of the three categories should be returned. If you consider that the image does not fit any of these categories, respond with {\"category\": \"Unknown\"}.",
    };

 
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                category: {
                    type: Type.STRING,
                    description: 'The category of the image. Must be one of: Church, Celebration, Party, Unknown.',
                    enum: ['Church', 'Celebration', 'Party', 'Unknown']
                }
            },
            required: ['category']
        }
      }
    });

    const jsonString = response.text.trim();
    
    const result = JSON.parse(jsonString);
    
    if (result.category && ['Church', 'Celebration', 'Party'].includes(result.category)) {
        return result.category;
    }
     
    return null;
  } catch (error) {
 
    
    return null; // Return null if classification fails
  }
}

const getFileType = (fileName: string): 'image' | 'video' => {
  const name = fileName.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.wmv', '.flv'];
  if (videoExtensions.some(ext => name.endsWith(ext))) {
    return 'video';
  }
  return 'image';
};

export const uploadFile = async (
  file: File,
  userId: string,
  onProgress: (update: UploadProgressUpdate) => void,
  maxRetries = MAX_UPLOAD_RETRIES
): Promise<string> => {
  const fileName = buildStoredFileName(file.name);
  const basePath = `feedPosts/${userId}`;
  const fileRef = ref(storage, `${basePath}/${fileName}`);

  const metadata: UploadMetadata = {
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: file.type || undefined,
  };

  let attempt = 0;

  while (attempt < maxRetries) {
    attempt += 1;
    onProgress({
      status: 'uploading',
      attempts: attempt,
      error: undefined,
      totalBytes: file.size,
    });

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);

        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const totalBytes = snapshot.totalBytes || file.size;
            const transferredBytes = snapshot.bytesTransferred;
            const progress = totalBytes > 0 ? (transferredBytes / totalBytes) * 100 : 0;

            onProgress({
              status: 'uploading',
              attempts: attempt,
              progress,
              transferredBytes,
              totalBytes,
            });
          },
          reject,
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (error) {
              reject(error);
            }
          },
        );
      });

      onProgress({
        status: 'processing',
        attempts: attempt,
        progress: 100,
        transferredBytes: file.size,
        totalBytes: file.size,
      });

      if (file.type.startsWith('image/')) {
        classifyImage(fileName, userId, file.type)
          .then(imageCategory => {
            if (!imageCategory) {
              return;
            }

            return copyFileToCategory(fileName, userId, imageCategory).catch(error => {
              console.error(`Failed to copy file ${fileName} to category ${imageCategory}:`, error);
            });
          })
          .catch(error => {
            console.error(`Failed to classify file ${fileName}:`, error);
          });
      }

      onProgress({
        status: 'completed',
        attempts: attempt,
        progress: 100,
        transferredBytes: file.size,
        totalBytes: file.size,
      });

      return url;
    } catch (error) {
      console.error(`Upload failed for ${file.name} (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt >= maxRetries || !isRetryableUploadError(error)) {
        onProgress({
          status: 'failed',
          attempts: attempt,
          error: error instanceof Error ? error.message : 'Error desconocido durante la subida.',
        });
        throw error;
      }

      const backoffDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      onProgress({
        status: 'queued',
        attempts: attempt,
        error: `Reintentando en ${Math.round(backoffDelay / 1000)}s`,
      });
      await sleep(backoffDelay);
    }
  }

  throw new Error(`Upload exhausted retries for ${file.name}`);
};

export const handleFileUploadProcess = async (
  files: FileList | null,
  userId: string,
  setIsUploading: (isUploading: boolean) => void,
  setUploadState: Dispatch<SetStateAction<UploadBatchState | null>>,
  onSuccess: (summary: UploadBatchSummary) => Promise<void>,
  onError: (error: any) => void,
  onFinally: () => void
) => {
  if (!files || files.length === 0) return;

  const entries = Array.from(files).map((file, index) => ({
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    fileName: file.name,
    size: file.size,
  }));
  const maxConcurrency = Math.min(getPreferredUploadConcurrency(), entries.length);

  setIsUploading(true);
  setUploadState(createInitialBatchState(entries, maxConcurrency));

  try {
    const successful: string[] = [];
    const failed: UploadBatchSummary['failed'] = [];
    let currentIndex = 0;

    const workerCount = Math.max(1, maxConcurrency);
    const workers = Array.from({ length: workerCount }, async () => {
      while (currentIndex < entries.length) {
        const entry = entries[currentIndex];
        currentIndex += 1;

        if (!entry) {
          return;
        }

        try {
          await uploadFile(entry.file, userId, update => {
            updateUploadItem(setUploadState, entry.id, current => ({
              ...current,
              status: update.status ?? current.status,
              progress: update.progress ?? current.progress,
              transferredBytes: Math.min(update.transferredBytes ?? current.transferredBytes, update.totalBytes ?? current.size),
              attempts: update.attempts ?? current.attempts,
              error: update.error,
            }));
          });
          successful.push(entry.fileName);
        } catch (error) {
          failed.push({
            fileName: entry.fileName,
            reason: error instanceof Error ? error.message : 'Error desconocido durante la subida.',
          });
        }
      }
    });

    await Promise.all(workers);

    await onSuccess({
      totalFiles: entries.length,
      totalBytes: entries.reduce((total, entry) => total + entry.size, 0),
      successfulFiles: successful.length,
      failedFiles: failed.length,
      successful,
      failed,
    });
  } catch (error) {
    onError(error);
  } finally {
    setIsUploading(false);
    onFinally();
  }
};

export const getProfileImageUrl = async (userId: string): Promise<string | null> => {
  try {
    const fileRef = ref(storage, `profileImages/${userId}/profile.jpg`);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    console.warn(`Profile image 'profileImages/${userId}/profile.jpg' not found in Firebase Storage.`);
    return null;
  }
};

export interface ListMediaResult {
  files: MediaFile[];
  nextPageToken?: string;
}

const DEFAULT_PAGE_SIZE = 21; // A multiple of 3 for the grid layout

export const listMediaFiles = async (
  userId: string,
  category: string | null = null,
  pageToken?: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<ListMediaResult> => {
  try {
    const basePath = category ? `feedPosts/${userId}/${category}` : `feedPosts/${userId}`;
    const mediaFolderRef = ref(storage, basePath);

    const listResponse: ListResult = await list(mediaFolderRef, {
      maxResults: pageSize,
      pageToken: pageToken,
    });

    const mediaFilesPromises = listResponse.items.map(async (itemRef: StorageReference) => {
      const url = await getDownloadURL(itemRef);
      return {
        name: itemRef.name,
        url,
        type: getFileType(itemRef.name)
      };
    });

    const files = await Promise.all(mediaFilesPromises);

    return {
      files,
      nextPageToken: listResponse.nextPageToken,
    };

  } catch (error) {
    console.error("Error listing files:", error);
    alert("Could not list files. Please check your Firebase Storage setup and ensure security rules allow public read access for the specified path.");
    return { files: [], nextPageToken: undefined };
  }
};

export const deleteFile = async (fileName: string, userId: string, category: string | null = null): Promise<void> => {
  const basePath = category ? `feedPosts/${userId}/${category}` : `feedPosts/${userId}`;
  const fileRef = ref(storage, `${basePath}/${fileName}`);
  try {
    await deleteObject(fileRef);
  } catch (error) {
    console.error(`Error deleting file ${fileName}:`, error);
    throw error;
  }
};

export const deleteFileFromAllLocations = async (fileName: string, userId: string): Promise<void> => {
  console.log(`Starting deletion of ${fileName} from all locations for user ${userId}...`);
  
  const locations = [
    `feedPosts/${userId}`, // Main folder
    `feedPosts/${userId}/Church`, // Church category
    `feedPosts/${userId}/Celebration`, // Celebration category
    `feedPosts/${userId}/Party`, // Party category
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const location of locations) {
    const fullPath = `${location}/${fileName}`;
    const fileRef = ref(storage, fullPath);
    
    console.log(`Attempting to delete from: ${fullPath}`);
    
    try {
      await deleteObject(fileRef);
      successCount++;
      console.log(`✅ Successfully deleted ${fileName} from ${location}`);
    } catch (error: any) {
      if (error?.code === 'storage/object-not-found') {
        console.log(`ℹ️ File ${fileName} not found in ${location} (this is normal)`);
      } else {
        errorCount++;
        console.error(`❌ Error deleting ${fileName} from ${location}:`, error);
        console.error(`Error code: ${error?.code}, message: ${error?.message}`);
      }
    }
  }

  console.log(`Deletion process completed for ${fileName}:`);
  console.log(`- Successful deletions: ${successCount}`);
  console.log(`- Errors encountered: ${errorCount}`);
  
  if (successCount === 0 && errorCount > 0) {
    throw new Error(`Failed to delete ${fileName} from any location`);
  }
};

export const copyFileToCategory = async (
  fileName: string,
  userId: string,
  category: string
): Promise<void> => {
  // referencia al archivo original
  const sourceRef = ref(storage, `feedPosts/${userId}/${fileName}`);

  // referencia destino (misma estructura pero con categoría)
  const destRef = ref(storage, `feedPosts/${userId}/${category}/${fileName}`);

  try {
    // obtenemos el blob del archivo original
    const blob = await getBlob(sourceRef);

    // lo subimos directamente al nuevo path
    await uploadBytes(destRef, blob);

    console.log(`Archivo '${fileName}' copiado a la categoría '${category}'`);
  } catch (error) {
    console.error(`Error copiando archivo '${fileName}' a '${category}':`, error);
    throw error;
  }
};


export const checkCategoryContent = async (
  userId: string,
  category: string
): Promise<boolean> => {
  const categoryRef = ref(storage, `feedPosts/${userId}/${category}`);
  try {
    // List with a small maxResults to check if there are actual files
    const result = await list(categoryRef, { maxResults: 10 });
    
    // Only count actual file items, not prefixes (folders)
    const hasItems = result.items.length > 0;
    
    // Return true only if there are actual file items (not just folders/prefixes)
    return hasItems;
  } catch (error) {
    // If the folder doesn't exist, Firebase throws an error
    //console.log(`⚠️ Category "${category}" appears to be empty or doesn't exist:`, error);
    return false;
  }
};
