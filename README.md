![Banner](.github/images/banner.png)

This is a comprehensive `README.md` designed for your **Aran Media Uploader** project. It combines the technical requirements, project structure, and setup instructions into a professional format.

---

# 📸 Aran Media Uploader

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange.svg)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

A high-performance, private media gallery and uploader specifically designed for wedding events. This application allows guests to seamlessly upload and view photos and videos in a shared, secure environment.

<div align="center">
<img width="600" alt="Aran Media Uploader Banner" src="image.png" />
</div>

## ✨ Features

- 🔐 **Secure Access**: Protected by a shared "Master Password" stored in Firestore.
- 🚀 **Fast Performance**: Built with React 19 and Vite for near-instant load times.
- 📱 **Mobile First**: PWA-ready with Service Worker support for a native app feel.
- 📤 **Efficient Uploads**: Real-time upload progress tracking and batch processing.
- 📖 **Story Viewer**: Instagram-style viewer for an immersive media experience.
- 📁 **Folder Management**: Organize media into categories or event moments.
- ⚡ **Optimized UI**: Includes skeleton screens, lazy loading, and smooth transitions.
- 📦 **Batch Download**: Export entire galleries as ZIP files (via `jszip`).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Processing**: Sharp (for media optimization), Google Generative AI (optional metadata tagging)
- **Caching**: Service Workers & LRU Cache for offline/speed optimization

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Firebase Project**: A project with Authentication, Firestore, and Storage enabled.
- **Google Cloud SDK**: Required for setting CORS policies.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/aran-media-uploader.git
   cd aran-media-uploader
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env.local` file in the root directory and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

---

## ⚙️ Firebase Setup

### 1. Authentication
- Enable **Anonymous Authentication** in the Firebase Console.
- Add your deployment domains (e.g., `your-wedding.vercel.app`) to the **Authorized Domains** list.

### 2. Firestore Configuration
The app validates access via a shared password. Create the following structure:
- **Collection**: `config`
- **Document**: `settings` (or any ID)
- **Field**: `MasterPass` (String) — *Example: "OurWedding2024"*

### 3. Storage Rules
Deploy the provided `storage.rules` to ensure only authenticated users can upload:
```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. CORS Configuration
To allow the ZIP download feature to function in the browser, you must apply the CORS policy to your bucket.

1. Authenticate with Google Cloud: `gcloud auth login`.
2. Run the following command:
   ```bash
   gsutil cors set cors.json gs://your-bucket-id.firebasestorage.app
   ```

---

## 📦 Project Structure

```text
├── components/          # Reusable UI components
│   ├── AuthScreen.tsx   # Login logic with MasterPass
│   ├── Gallery.tsx      # Main gallery container
│   ├── StoryViewer.tsx  # Full-screen media viewer
│   └── ...
├── services/            # Firebase and Caching logic
├── scripts/             # Utility scripts (Sharp-based processing)
├── service-worker.ts    # PWA and offline strategy
├── types.ts             # TypeScript interfaces
├── storage.rules        # Firebase Storage security rules
└── cors.json            # Cross-Origin Resource Sharing config
```

---

## 🛠️ Development

**Start the development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Generate Optimized Media:**
If you need to pre-process images locally using Sharp:
```bash
node scripts/generate-medium.mjs
```

---

## 📖 Usage Examples

### Authenticating
The `AuthScreen.tsx` component checks the user's input against the `MasterPass` stored in Firestore. Once verified, it signs the user in anonymously:

```typescript
// Internal logic snippet
const handleLogin = async (inputPass: string) => {
  const configRef = doc(db, 'config', 'settings');
  const configSnap = await getDoc(configRef);
  
  if (configSnap.data()?.MasterPass === inputPass) {
    await signInAnonymously(auth);
  }
};
```

### Media Upload
Users can drag and drop or select files. The `UploadProgress.tsx` component will track the status for each file using Firebase Storage's `uploadBytesResumable`.

---

## 📄 License
This project is private and intended for personal use.

---
*Created with ❤️ for a special day.*