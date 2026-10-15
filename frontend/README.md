# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```





UPDATES: 10 oct 3:35

# 🩺 MedVision — Clinical Decision Support & Chest X-Ray Analytics Platform

MedVision is an end-to-end, AI-driven Clinical Decision Support System (CDSS) built to assist radiologists and clinicians in detecting pulmonary conditions—specifically Pneumonia—from chest X-rays. 

The application pairs deep learning classification (**DenseNet121**) with real-time computer vision explainability (**Grad-CAM**) and robust patient record management to bridge AI findings directly into standard clinical workflows.

---

## 📸 Key Features

- **🔐 Authenticated Clinician Access:** Secure authentication flow (Login/Sign-up) powered by Firebase Auth and protected client-side routes.
- **📁 Patient Management & Indexing:** Full patient lifecycle management backed by Firestore composite indexing for structured, real-time query performance.
- **🧠 Deep Learning Inference:** Asynchronous ML pipeline utilizing PyTorch and DenseNet121 fine-tuned for high-sensitivity pulmonary screening.
- **🔥 Grad-CAM Explainability:** Instant visual heatmap generation powered by OpenCV, highlighting specific spatial regions (consolidation/opacities) driving the model's confidence.
- **📜 Patient Timeline & Record Persistence:** Automatically links every examination scan and heatmap overlay directly to individual patient profiles in Firestore.
- **📄 Exportable Clinical PDF Reports:** One-click generation of professional PDF diagnostic reports containing patient demographics, model confidence, visual heatmap overlays, and clinician signature blocks.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React 18 (TypeScript) + Vite
- **Styling:** Tailwind CSS (Dark Clinical Theme)
- **Routing:** React Router v6
- **PDF Generation:** `jspdf` + `html2canvas`
- **State & Auth:** Firebase Authentication SDK

### **Backend**
- **API Framework:** FastAPI (Python 3.10+)
- **ML & Computer Vision:** PyTorch, Torchvision, OpenCV (`opencv-python`), PIL, PyDICOM
- **Database Administration:** Firebase Admin SDK (Firestore)
- **Server:** Uvicorn (ASGI)

---

## 🏗️ System Architecture
┌─────────────────────────────────────────────────────────────────────────┐│                           React Frontend (Vite)                         ││  [ Auth / Login ] ──► [ Patient Management ] ──► [ X-Ray Upload ]       ││                                                       │                 │└───────────────────────────────────────────────────────┼─────────────────┘│ Multipart Upload▼ (Bearer Token)┌─────────────────────────────────────────────────────────────────────────┐│                          FastAPI Python Backend                         ││                                                                         ││  1. Verify Auth Token                                                  ││  2. Process DICOM / PNG / JPG Array                                     ││  3. PyTorch (DenseNet121) ──► Compute Probability                       ││  4. OpenCV (Grad-CAM Hook) ──► Generate Heatmap Overlay (Base64)         ││  5. Firebase Admin SDK ──► Save Record to Firestore                     │└───────────────────────────────────────────────────────┬─────────────────┘│ Persistent Write▼┌─────────────────────────────────────────────────────────────────────────┐│                            Firestore Database                           ││  - /patients/{patientId}                                                ││  - /examinations/{examId}  [Indexed by patientId & createdAt]           │└─────────────────────────────────────────────────────────────────────────┘
---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) & `npm`
- Python 3.10+
- Firebase Project with **Authentication** and **Firestore Database** enabled

---

### 1. Repository Setup
```bash
git clone [https://github.com/your-username/medvision.git](https://github.com/your-username/medvision.git)
cd medvision
2. Backend Configuration & SetupNavigate to the backend directory & create a virtual environment:Bashcd backend
python3 -m venv venv
source venv/bin/activate
Install dependencies:Bashpip install -r requirements.txt
(Ensure torch, torchvision, fastapi, uvicorn, opencv-python, pydicom, pillow, firebase-admin are installed).Firebase Service Account Credentials:Go to Firebase Console $\rightarrow$ Project Settings $\rightarrow$ Service Accounts.Click Generate New Private Key (Python SDK).Move the downloaded .json file into backend/ and rename it to firebase-credentials.json.Model Checkpoint:Place your trained PyTorch weights file at backend/app/models/densenet121_pneumonia.pth.Start the FastAPI server:Bashuvicorn app.main:app --reload
The backend will be live at http://127.0.0.1:8000.3. Frontend Configuration & SetupNavigate to the frontend directory:Bashcd ../frontend
npm install
Environment Variables:Create a .env file in the frontend/ directory with your Firebase Web configuration:Code snippetVITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
Start the Vite development server:Bashnpm run dev
Open http://localhost:5173 in your browser.📊 Database Schema (Firestore)patients CollectionJSON{
  "name": "Jane Doe",
  "patientCode": "HOS-1",
  "patientId": "PAT-38488",
  "age": 35,
  "sex": "Female",
  "bloodGroup": "O+",
  "allergies": "None reported",
  "knownConditions": "None reported",
  "doctorId": "clinician_uid_123",
  "createdAt": "Timestamp"
}
examinations CollectionJSON{
  "patientId": "0G5n5u0eT6ej7xrytfuC",
  "doctorId": "clinician_uid_123",
  "filename": "chest_xray.png",
  "prediction": "High Risk: Pneumonia Detected",
  "confidence": 0.841,
  "gradcam": "data:image/png;base64,...",
  "modelVersion": "DenseNet121-v1",
  "createdAt": "Timestamp"
}
🔒 Security & Data PrivacyGit Rules: firebase-credentials.json and .env files are strictly specified in .gitignore to prevent secret leaks.Auth Tokens: Frontend requests send Firebase JWT Bearer tokens in the Authorization header for server-side verification.Medical Disclaimer: MedVision is designed strictly as a clinical decision support and screening aid. It does not replace definitive medical diagnoses by certified radiologists.