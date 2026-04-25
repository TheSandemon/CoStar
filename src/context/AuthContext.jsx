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
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
    createOrSyncUserProfileFromAuth,
    isAccountType,
} from '@/lib/profile';

async function bootstrapAccount(currentUser, requestedType) {
    const token = await currentUser.getIdToken();
    const response = await fetch('/api/account/bootstrap', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestedType }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = async (requestedType = null) => {
        if (!auth) {
            alert("Firebase Auth not initialized. Please check environment variables.");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            if (requestedType && isAccountType(requestedType)) {
                window.sessionStorage.setItem('costar:requestedAccountType', requestedType);
            }
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

            try {
                if (!db) {
                    console.warn("Firestore not initialized");
                    setUser({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        accountType: null,
                        role: 'user',
                        getIdToken: () => currentUser.getIdToken(),
                    });
                    setLoading(false);
                    return;
                }

                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                const storedRequestedType = window.sessionStorage.getItem('costar:requestedAccountType');
                const requestedType = isAccountType(storedRequestedType) ? storedRequestedType : null;
                window.sessionStorage.removeItem('costar:requestedAccountType');

                let profile;
                try {
                    profile = await bootstrapAccount(
                        currentUser,
                        userSnap.exists() && userSnap.data()?.accountType ? null : requestedType
                    );
                } catch (bootstrapError) {
                    console.warn("Server bootstrap failed; falling back to client sync:", bootstrapError);
                    profile = await createOrSyncUserProfileFromAuth(
                        currentUser,
                        userSnap.exists() && userSnap.data()?.accountType ? null : requestedType
                    );
                }

                setUser({
                    ...profile,
                    getIdToken: () => currentUser.getIdToken(),
                });
            } catch (error) {
                console.error("Background Sync Error:", error);
                setUser({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    accountType: null,
                    role: 'user',
                    getIdToken: () => currentUser.getIdToken(),
                });
            } finally {
                setLoading(false);
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
