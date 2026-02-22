import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBBm__jGmTdBsg-MJsTUvjDFsKA8lpMQvQ",
    authDomain: "innovate2-79572.firebaseapp.com",
    projectId: "innovate2-79572",
    storageBucket: "innovate2-79572.firebasestorage.app",
    messagingSenderId: "971267702302",
    appId: "1:971267702302:web:48aeafd4058fb096fbb80f",
    measurementId: "G-DY7HBCYJ1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let analytics;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

export { app, db, analytics };
