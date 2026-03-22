import type { Dispatch, SetStateAction } from 'react';
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  list,
  listAll,
  deleteObject,
  type StorageReference,
  type UploadTaskSnapshot,
  type ListResult,
  type UploadMetadata
} from "firebase/storage";

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
const auth = getAuth(app);
const storage = getStorage(app);
const GALLERY_PASSWORD = 'bodorrio';

const MAX_PARALLEL_UPLOADS = 3;
const MAX_UPLOAD_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 1500;
const THUMBNAIL_MAX_DIMENSION = 480;
const THUMBNAIL_QUALITY = 0.72;
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

const HIDDEN_STORAGE_FILE_PREFIX = '.';

const sanitizeFileName = (name: string) => name.replace(/[\/\\#?]/g, '_');

export const normalizeFolderName = (name: string): string => (
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
);

const buildStoredFileName = (name: string) => `${Number.MAX_SAFE_INTEGER - Date.now()}-${sanitizeFileName(name)}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const THUMBNAIL_FOLDER = 'thumbnails';

const buildMediaBasePath = (userId: string, category: string | null = null): string => (
  category ? `feedPosts/${userId}/${category}` : `feedPosts/${userId}`
);

const buildThumbnailBasePath = (userId: string, category: string | null = null): string => (
  category ? `${buildMediaBasePath(userId, category)}/${THUMBNAIL_FOLDER}` : `${buildMediaBasePath(userId)}/${THUMBNAIL_FOLDER}`
);

const isVisibleMediaItem = (itemRef: StorageReference): boolean => !itemRef.name.startsWith(HIDDEN_STORAGE_FILE_PREFIX);

const shouldGenerateThumbnail = (file: File) => file.type.startsWith('image/');

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = error => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    image.src = objectUrl;
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('No se pudo generar la miniatura.'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
};

const createThumbnailBlob = async (file: File): Promise<Blob | null> => {
  if (!shouldGenerateThumbnail(file)) {
    return null;
  }

  const image = await loadImageElement(file);
  const largestSide = Math.max(image.width, image.height);

  if (!largestSide) {
    return null;
  }

  const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / largestSide);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo inicializar el canvas para generar la miniatura.');
  }

  context.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas, 'image/webp', THUMBNAIL_QUALITY);
};

const uploadThumbnail = async (thumbnailBlob: Blob, userId: string, fileName: string, category: string | null = null): Promise<void> => {
  const thumbnailRef = ref(storage, `${buildThumbnailBasePath(userId, category)}/${fileName}`);
  await uploadBytes(thumbnailRef, thumbnailBlob, {
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: thumbnailBlob.type || 'image/webp',
  });
};

const getThumbnailUrl = async (userId: string, fileName: string, category: string | null = null): Promise<string | undefined> => {
  try {
    const thumbnailRef = ref(storage, `${buildThumbnailBasePath(userId, category)}/${fileName}`);
    return await getDownloadURL(thumbnailRef);
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') {
      console.warn(`No se pudo cargar la miniatura para ${fileName}:`, error);
    }
    return undefined;
  }
};

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

const getFileType = (fileName: string): 'image' | 'video' => {
  const name = fileName.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.wmv', '.flv'];
  if (videoExtensions.some(ext => name.endsWith(ext))) {
    return 'video';
  }
  return 'image';
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => (
  onAuthStateChanged(auth, callback)
);

export const signInToGallery = async (email: string, password: string): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw { code: 'auth/missing-email' };
  }

  if (password !== GALLERY_PASSWORD) {
    throw { code: 'auth/invalid-gallery-password' };
  }

  const result = await signInAnonymously(auth);

  if (result.user.displayName !== normalizedEmail) {
    await updateProfile(result.user, {
      displayName: normalizedEmail,
    });
  }

  return result.user;
};

export const signOutCurrentUser = async (): Promise<void> => {
  await signOut(auth);
};

export const uploadFile = async (
  file: File,
  userId: string,
  onProgress: (update: UploadProgressUpdate) => void,
  maxRetries = MAX_UPLOAD_RETRIES,
  category: string | null = null
): Promise<string> => {
  const fileName = buildStoredFileName(file.name);
  const basePath = buildMediaBasePath(userId, category);
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

      if (shouldGenerateThumbnail(file)) {
        try {
          const thumbnailBlob = await createThumbnailBlob(file);
          if (thumbnailBlob) {
            await uploadThumbnail(thumbnailBlob, userId, fileName, category);
          }
        } catch (thumbnailError) {
          console.warn(`No se pudo generar la miniatura para ${file.name}:`, thumbnailError);
        }
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
  onFinally: () => void,
  category: string | null = null
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
          }, MAX_UPLOAD_RETRIES, category);
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

const DEFAULT_PAGE_SIZE = 20;

export const countMediaFiles = async (userId: string, category: string | null = null): Promise<number> => {
  try {
    const basePath = buildMediaBasePath(userId, category);
    const mediaFolderRef = ref(storage, basePath);
    const result = await listAll(mediaFolderRef);
    return result.items.filter(isVisibleMediaItem).length;
  } catch (error) {
    console.error('Error counting files:', error);
    return 0;
  }
};

export const listMediaFiles = async (
  userId: string,
  category: string | null = null,
  pageToken?: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<ListMediaResult> => {
  try {
    const basePath = buildMediaBasePath(userId, category);
    const mediaFolderRef = ref(storage, basePath);

    const listResponse: ListResult = await list(mediaFolderRef, {
      maxResults: pageSize,
      pageToken: pageToken,
    });

    const mediaFilesPromises = listResponse.items.filter(isVisibleMediaItem).map(async (itemRef: StorageReference) => {
      const url = await getDownloadURL(itemRef);
      const type = getFileType(itemRef.name);
      const previewUrl = type === 'image'
        ? await getThumbnailUrl(userId, itemRef.name, category) ?? url
        : undefined;

      return {
        name: itemRef.name,
        url,
        previewUrl,
        type,
      };
    });

    const files = await Promise.all(mediaFilesPromises);

    return {
      files,
      nextPageToken: listResponse.nextPageToken,
    };

  } catch (error) {
    console.error("Error listing files:", error);
    alert("No se pudieron cargar los archivos. Revisa la sesion actual y las reglas de Firebase Storage.");
    return { files: [], nextPageToken: undefined };
  }
};

export const deleteFile = async (fileName: string, userId: string, category: string | null = null): Promise<void> => {
  const basePath = buildMediaBasePath(userId, category);
  const fileRef = ref(storage, `${basePath}/${fileName}`);
  try {
    await deleteObject(fileRef);
  } catch (error) {
    console.error(`Error deleting file ${fileName}:`, error);
    throw error;
  }
};

export const listMediaFolders = async (userId: string): Promise<string[]> => {
  try {
    const rootFolderRef = ref(storage, buildMediaBasePath(userId));
    const result = await listAll(rootFolderRef);

    return result.prefixes
      .map(prefix => prefix.name)
      .filter(prefix => prefix !== THUMBNAIL_FOLDER)
      .sort((left, right) => left.localeCompare(right, 'es'));
  } catch (error) {
    console.error('Error listing media folders:', error);
    return [];
  }
};

export const createMediaFolder = async (userId: string, folderName: string): Promise<string> => {
  const normalizedFolderName = normalizeFolderName(folderName);

  if (!normalizedFolderName) {
    throw new Error('Introduce un nombre de carpeta válido.');
  }

  const placeholderRef = ref(storage, `${buildThumbnailBasePath(userId, normalizedFolderName)}/.keep`);
  await uploadBytes(placeholderRef, new Blob([''], { type: 'text/plain' }), {
    cacheControl: 'no-store',
    contentType: 'text/plain',
  });

  return normalizedFolderName;
};

export const deleteFileFromAllLocations = async (fileName: string, userId: string, category: string | null = null): Promise<void> => {
  if (category) {
    const locations = [
      buildMediaBasePath(userId, category),
      buildThumbnailBasePath(userId, category),
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const location of locations) {
      const fullPath = `${location}/${fileName}`;
      const fileRef = ref(storage, fullPath);

      try {
        await deleteObject(fileRef);
        successCount += 1;
      } catch (error: any) {
        if (error?.code !== 'storage/object-not-found') {
          errorCount += 1;
          console.error(`Error deleting ${fileName} from ${location}:`, error);
        }
      }
    }

    if (successCount === 0 && errorCount > 0) {
      throw new Error(`Failed to delete ${fileName} from ${category}`);
    }

    return;
  }

  console.log(`Starting deletion of ${fileName} from all locations for user ${userId}...`);
  
  const locations = [
    buildMediaBasePath(userId), // Main folder
    buildThumbnailBasePath(userId), // Thumbnails
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
