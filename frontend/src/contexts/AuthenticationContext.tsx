import React, {createContext, ReactNode, useEffect, useState} from "react";
import {getAuth, onAuthStateChanged, User} from "firebase/auth";
import {Box, CircularProgress, Stack} from "@mui/material";
import LoginPage from "../components/LoginPage.tsx";
import {FirebaseApiKey, FirebaseAuthDomain} from "../config.ts";
import {initializeApp} from "firebase/app";
import {Auth} from "firebase/auth";


const config = {
    apiKey: FirebaseApiKey,
    authDomain: FirebaseAuthDomain,
};

const app = initializeApp(config);
const auth = getAuth(app);

export type AuthenticationContextType = {
    auth: Auth,
    user: User | null;
};

export const AuthenticationContext = createContext<AuthenticationContextType>({
    user: null,
    auth: auth
});


export const AuthenticationContextProvider: React.FC<{children: ReactNode}> = ({ children }) => {

    const [isLoading, setLoading] = useState<boolean>(true)
    const [authUser, setAuthUser] = useState<User|null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setLoading(false)
        });
        return () => unsubscribe();
    }, []);

    const loading =
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <Stack display="flex" justifyContent="center" alignItems="center">
                <CircularProgress />
            </Stack>
        </Box>

    if (isLoading) {
        return loading;
    }
    else if (authUser) {
        return <AuthenticationContext.Provider value={{user: authUser, auth}}>{children}</AuthenticationContext.Provider>;
    }
    else {
        return <AuthenticationContext.Provider value={{user: authUser, auth}}><LoginPage /></AuthenticationContext.Provider>;
    }
};