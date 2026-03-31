import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuração do Firebase - Use suas credenciais do Firebase Console
// Para usar este app, você precisa:
// 1. Criar um projeto no Firebase Console (https://console.firebase.google.com)
// 2. Ativar Firestore Database
// 3. Copiar as credenciais abaixo
const firebaseConfig = {
  apiKey: "AIzaSyBIfND-PeSLeag1-ijucS_vQtaRO8RpKeo",
  authDomain: "escala-bloco-491822.firebaseapp.com",
  projectId: "escala-bloco-491822",
  storageBucket: "escala-bloco-491822.firebasestorage.app",
  messagingSenderId: "323547410049",
  appId: "1:323547410049:web:5cfefb505f41981766e780"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
