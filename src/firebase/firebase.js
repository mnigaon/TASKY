// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase 프로젝트 설정 (Firebase 콘솔에서 복사)
const firebaseConfig = {
    apiKey: "AIzaSyCN3ZqNtBguKHl84DzuuZEdAvDRAFWuTx0",
    authDomain: "tasky-d81f5.firebaseapp.com",
    projectId: "tasky-d81f5",
    storageBucket: "tasky-d81f5.firebasestorage.app",
    messagingSenderId: "994055416601",
    appId: "1:994055416601:web:22d3ae6e7d05b4b5a07388",
    measurementId: "G-Z92NR985ZM"
  };

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 인증 객체 및 Google provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };

// Firestore
export const db = getFirestore(app);

export const storage = getStorage(app);