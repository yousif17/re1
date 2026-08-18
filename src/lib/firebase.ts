import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiDwr4vcuIaagQjKw978vEa0wLsOojm3c",
  authDomain: "restaurant-os-b74a3.firebaseapp.com",
  projectId: "restaurant-os-b74a3",
  storageBucket: "restaurant-os-b74a3.firebasestorage.app",
  messagingSenderId: "1051697930073",
  appId: "1:1051697930073:web:5480efad411b0e66102aa8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const firestore = getFirestore(app);