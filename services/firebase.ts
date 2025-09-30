// FIX: Changed Firebase import to use a namespace (`import * as firebaseApp`) to potentially resolve module resolution issues with named exports.
import React from 'react';
// FIX: Changed to namespace import to resolve issue where `initializeApp` was not found as a named export.
import * as firebaseApp from "firebase/app";
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


import { MediaFile } from '../types';

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
const app = firebaseApp.initializeApp(firebaseConfig);
const storage = getStorage(app);

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
  onProgress: (progress: number) => void,
  userId: string,
  category: string | null = null,
  maxRetries = 2
): Promise<string> => {

  // Función para sanear el nombre de archivo
  const sanitizeFileName = (name: string) =>
    name.replace(/[\/\\#?]/g, '_');

  const fileName = `${Number.MAX_SAFE_INTEGER - Date.now()}-${sanitizeFileName(file.name)}`;
  const basePath = category ? `feedPosts/${userId}/${category}` : `feedPosts/${userId}`;
  const fileRef = ref(storage, `${basePath}/${fileName}`);

  // Set cache control headers for the uploaded file for better performance.
  const metadata: UploadMetadata = {
    cacheControl: 'public, max-age=31536000, immutable',
  };

  let attempt = 0;

  const tryUpload = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, file, metadata);

      uploadTask.on(
        "state_changed",
        (snapshot: UploadTaskSnapshot) => {
          const progress = snapshot.totalBytes > 0
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;
          onProgress(progress);
        },
        (error) => {
          console.error(`Upload failed (attempt ${attempt + 1}):`, error);
          attempt++;
          if (attempt <= maxRetries) {
            console.log(`Reintentando subida... (${attempt}/${maxRetries})`);
            resolve(tryUpload()); // reintento
          } else {
            reject(error);
          }
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  };

  return tryUpload();
};

export const handleFileUploadProcess = async (
    files: FileList | null,
    userId: string,
    category: string | null,
    setIsUploading: (isUploading: boolean) => void,
    setUploadProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    onSuccess: () => Promise<void>,
    onError: (error: any) => void,
    onFinally: () => void
) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});
    
    const uploadTasks = Array.from(files).map(file => {
        return uploadFile(file, progress => {
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        }, userId, category);
    });

    try {
        await Promise.all(uploadTasks);
        await onSuccess();
    } catch (error) {
        onError(error);
    } finally {
        setIsUploading(false);
        setUploadProgress({});
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
        const result = await list(categoryRef, { maxResults: 1 });
        return result.items.length > 0;
    } catch (error) {
        console.error(`Error checking content for category '${category}':`, error);
        return false; // Assume no content on error
    }
};