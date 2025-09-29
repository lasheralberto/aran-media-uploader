// Fix: Use 'type' keyword for type-only imports for better clarity and to avoid potential module resolution issues.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    list,
    deleteObject,
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
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const mediaFolderRef = ref(storage, 'media');

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
  maxRetries = 2
): Promise<string> => {

  // Función para sanear el nombre de archivo
  const sanitizeFileName = (name: string) =>
    name.replace(/[\/\\#?]/g, '_');

  const fileName = `${Number.MAX_SAFE_INTEGER - Date.now()}-${sanitizeFileName(file.name)}`;
  const fileRef = ref(storage, `media/${fileName}`);

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

export const getProfileImageUrl = async (): Promise<string | null> => {
    try {
        const fileRef = ref(storage, 'media/profile.jpg');
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (error) {
        console.warn("Profile image 'media/profile.jpg' not found in Firebase Storage.");
        return null;
    }
};

export const downloadFileBlob = (fileName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const fileRef = ref(storage, `media/${fileName}`);
        
        getDownloadURL(fileRef)
            .then((url) => {
                const xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`Download failed with status: ${xhr.status}`));
                    }
                };
                
                xhr.onerror = () => {
                    reject(new Error("XMLHttpRequest error during file download."));
                };
                
                xhr.open('GET', url);
                xhr.send();
            })
            .catch((error) => {
                console.error("Error getting download URL for blob:", error);
                reject(error);
            });
    });
};


export interface ListMediaResult {
    files: MediaFile[];
    nextPageToken?: string;
}

const PAGE_SIZE = 21; // A multiple of 3 for the grid layout

export const listMediaFiles = async (pageToken?: string): Promise<ListMediaResult> => {
    try {
        const listResponse: ListResult = await list(mediaFolderRef, {
            maxResults: PAGE_SIZE,
            pageToken: pageToken,
        });

        const filteredItems = listResponse.items.filter(item => item.name !== 'profile.jpg');

        const mediaFilesPromises = filteredItems.map(async (itemRef: StorageReference) => {
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
        alert("Could not list files. Please check your Firebase Storage setup and ensure security rules allow public read access. (e.g., allow read: if true;)");
        return { files: [], nextPageToken: undefined };
    }
};

export const deleteFile = async (fileName: string): Promise<void> => {
    const fileRef = ref(storage, `media/${fileName}`);
    try {
        await deleteObject(fileRef);
    } catch (error) {
        console.error(`Error deleting file ${fileName}:`, error);
        throw error;
    }
};