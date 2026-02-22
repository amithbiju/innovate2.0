import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";

import {
    projects,
    kpiData,
    progressData,
    activityFeed,
    modules,
    timelineEvents,
    risks,
    traceability,
    graphNodes,
    graphEdges,
    chatMessages,
} from "../data/mockData.js";

const firebaseConfig = {
    apiKey: "AIzaSyBBm__jGmTdBsg-MJsTUvjDFsKA8lpMQvQ",
    authDomain: "innovate2-79572.firebaseapp.com",
    projectId: "innovate2-79572",
    storageBucket: "innovate2-79572.firebasestorage.app",
    messagingSenderId: "971267702302",
    appId: "1:971267702302:web:48aeafd4058fb096fbb80f",
    measurementId: "G-DY7HBCYJ1T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_DATA = {
    projects,
    kpiData: [kpiData],
    progressData,
    activityFeed,
    modules,
    timelineEvents,
    risks,
    traceability,
    graphNodes,
    graphEdges,
    chatMessages,
};

const seedDatabase = async () => {
    console.log("Starting database seed...");
    try {
        const batch = writeBatch(db);

        for (const [collectionName, dataArray] of Object.entries(SEED_DATA)) {
            console.log(`Seeding collection: ${collectionName} (${dataArray.length} items)`);

            dataArray.forEach((item) => {
                let docRef;
                if (item.id) {
                    docRef = doc(db, collectionName, String(item.id));
                } else {
                    docRef = doc(collection(db, collectionName));
                }
                batch.set(docRef, item);
            });
        }

        await batch.commit();
        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();
