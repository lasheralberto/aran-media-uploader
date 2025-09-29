// Fix: Use 'type' keyword for type-only imports for better clarity and to avoid potential module resolution issues.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    listAll,
    type UploadTaskSnapshot,
    type StorageReference
} from "firebase/storage";
import { MediaFile } from '../types';

// TODO: Add your Firebase project's configuration here.
// You can get this from your project's settings in the Firebase console.
// IMPORTANT: For security, it is highly recommended to use environment variables
// for this sensitive information, especially in a production environment.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
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

export const uploadFile = (
    file: File, 
    onProgress: (progress: number) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Using a timestamp to help ensure file names are unique
        const fileRef = ref(storage, `media/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed', 
            (snapshot: UploadTaskSnapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            }, 
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            }, 
            () => {
                resolve();
            }
        );
    });
};

export const listAllFiles = async (): Promise<MediaFile[]> => {
    try {
        const listResponse = await listAll(mediaFolderRef);
        const mediaFilesPromises = listResponse.items.map(async (itemRef: StorageReference) => {
            const url = await getDownloadURL(itemRef);
            return {
                name: itemRef.name,
                url,
                type: getFileType(itemRef.name)
            };
        });

        const settledPromises = await Promise.all(mediaFilesPromises);
        // Sort by name descending to show the newest files first
        return settledPromises.sort((a, b) => b.name.localeCompare(a.name));

    } catch (error) {
        console.error("Error listing files:", error);
        alert("Could not list files. Please check your Firebase Storage setup and ensure security rules allow public read access. (e.g., allow read: if true;)");
        return [];
    }
};