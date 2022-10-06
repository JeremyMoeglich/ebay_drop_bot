import { initializeApp } from "firebase/app";
import {
    getAuth,
    User,
    signInWithEmailAndPassword,
    onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { error } from "functional-utilities";

const firebaseConfig = {
    apiKey: "AIzaSyBxa3QjcGlcfzictoQpiT7iuIxf99ViVpM",
    authDomain: "tagaro-346715.firebaseapp.com",
    projectId: "tagaro-346715",
    storageBucket: "tagaro-346715.appspot.com",
    messagingSenderId: "162148161041",
    appId: "1:162148161041:web:e4acb74e3b23b03b4c43b0",
    measurementId: "G-SBNZSQV2MZ",
} as const;

export const firebase_app = initializeApp(firebaseConfig);
export const firestore = getFirestore(firebase_app);
export const auth = getAuth(firebase_app);

export async function init_firebase(): Promise<User> {
    await signInWithEmailAndPassword(
        auth,
        process.env.EMAIL ?? error("No Email found in env"),
        process.env.FIREBASE_PASSWORD ?? error("No firebase password found")
    );
    return await new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
}
