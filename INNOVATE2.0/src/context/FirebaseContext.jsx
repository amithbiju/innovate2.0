import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";

const FirebaseContext = createContext({});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = ({ children }) => {
    const [data, setData] = useState({
        projects: [],
        kpiData: {},
        progressData: [],
        activityFeed: [],
        modules: [],
        timelineEvents: [],
        risks: [],
        traceability: [],
        graphNodes: [],
        graphEdges: [],
        chatMessages: [],
        loading: true,
    });

    useEffect(() => {
        const unsubscribes = [];

        const collectionsToSync = [
            "projects",
            "progressData",
            "activityFeed",
            "modules",
            "timelineEvents",
            "risks",
            "traceability",
            "graphNodes",
            "graphEdges",
            "chatMessages",
            "kpiData"
        ];

        let collectionsLoaded = 0;

        collectionsToSync.forEach((colName) => {
            const q = query(collection(db, colName));
            const unsub = onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: isNaN(doc.id) ? doc.id : Number(doc.id) // keep numbers if they were numbers in mock
                }));

                setData((prev) => {
                    const newData = { ...prev };

                    if (colName === "kpiData") {
                        newData.kpiData = items.length > 0 ? items[0] : {};
                    } else {
                        newData[colName] = items;
                    }

                    if (prev.loading) {
                        collectionsLoaded++;
                        if (collectionsLoaded === collectionsToSync.length) {
                            newData.loading = false;
                        }
                    }
                    return newData;
                });
            }, (err) => {
                console.error(`Error loading ${colName} from Firebase:`, err);
            });

            unsubscribes.push(unsub);
        });

        // Fallback: forcefully end loading state after 2.5 seconds in case some collections are empty/missing
        const fallbackTimer = setTimeout(() => {
            setData(prev => {
                if (prev.loading) return { ...prev, loading: false };
                return prev;
            });
        }, 2500);

        return () => {
            unsubscribes.forEach((unsub) => unsub());
            clearTimeout(fallbackTimer);
        };
    }, []);

    return (
        <FirebaseContext.Provider value={data}>
            {children}
        </FirebaseContext.Provider>
    );
};
