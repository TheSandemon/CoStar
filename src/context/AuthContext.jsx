"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = async () => {
        if (!auth) {
            alert("Firebase Auth not initialized. Please check environment variables.");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in:", error);
            alert("Sign-In Error: " + error.message);
        }
    };

    const logout = () => auth ? signOut(auth) : Promise.resolve();

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            // Set user immediately with Auth data
            setUser({
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                role: 'user', // Default role
                getIdToken: () => currentUser.getIdToken(),
            });
            setLoading(false);

            // Background sync: Fetch/sync user data from Firestore
            try {
                if (!db) {
                    console.warn("Firestore not initialized");
                    setLoading(false);
                    return;
                }

                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    // Create new user document
                    const newUserData = {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        role: 'user',
                        accountType: null, // 'user' or 'business'
                        workVibe: null,
                        socialConnections: [],
                        workExperience: [],
                        education: [],
                        accolades: [],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };
                    await setDoc(userRef, newUserData);
                } else {
                    // Update existing user with latest auth data
                    const userData = userSnap.data();
                    setUser(prev => ({
                        ...prev,
                        ...userData
                    }));
                }
            } catch (error) {
                console.error("Background Sync Error:", error);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        signInWithGoogle,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
