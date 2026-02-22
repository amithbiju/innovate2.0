import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase.js";
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

const SEED_DATA = {
    projects,
    kpiData: [kpiData], // Wrap single object into array for collection flexibility, though keeping it single document works too
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

export const seedDatabase = async () => {
    console.log("Starting database seed...");
    try {
        const batch = writeBatch(db);

        for (const [collectionName, dataArray] of Object.entries(SEED_DATA)) {
            console.log(`Seeding collection: ${collectionName} (${dataArray.length} items)`);

            dataArray.forEach((item) => {
                // Use the ID from the mock data if available, otherwise let Firestore generate an ID
                let docRef;
                if (item.id) {
                    // Using ID as string for Firestore document ID stability
                    docRef = doc(db, collectionName, String(item.id));
                } else {
                    docRef = doc(collection(db, collectionName));
                }

                // Push the operation to the batch
                batch.set(docRef, item);
            });
        }

        // Commit the batch
        await batch.commit();
        console.log("Database seeded successfully!");
    } catch (error) {
        console.error("Error seeding database:", error);
    }
};
