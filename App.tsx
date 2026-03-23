import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import AuthScreen from './components/AuthScreen';
import Gallery from './components/Gallery';
import Spinner from './components/Spinner';
import { isAdminSession, signInToGallery, signOutCurrentUser, subscribeToAuthChanges } from './services/firebase';

const getAuthErrorMessage = (error: unknown): string => {
    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    switch (code) {
        case 'auth/missing-password':
            return 'Introduce la clave para entrar en la galeria.';
        case 'auth/invalid-gallery-password':
            return 'La clave no coincide con la configurada en la galeria.';
        case 'auth/master-password-not-configured':
            return 'No hay ninguna MasterPass configurada en la coleccion config de Firestore.';
        case 'permission-denied':
            return 'Firestore no permite leer la coleccion config. Revisa las reglas de acceso.';
        case 'auth/operation-not-allowed':
            return 'El proveedor Anonymous no esta habilitado en Firebase Authentication.';
        default:
            return 'No se pudo iniciar sesion. Revisa la configuracion de Firestore y Firebase Authentication.';
    }
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((user) => {
            setCurrentUser(user);
            setIsAdmin(isAdminSession(user));
            setIsAuthReady(true);
        });

        return unsubscribe;
    }, []);

    const handleSignIn = async (password: string) => {
        setIsSigningIn(true);
        setAuthError(null);

        try {
            const user = await signInToGallery(password);
            setIsAdmin(isAdminSession(user));
        } catch (error) {
            console.error('Error signing in to gallery:', error);
            setAuthError(getAuthErrorMessage(error));
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOutCurrentUser();
        } catch (error) {
            console.error('Error signing out:', error);
            alert('No se pudo cerrar la sesion. Intentalo de nuevo.');
        }
    };

    if (!isAuthReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-100 text-neutral-700">
                <div className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 py-3 shadow-sm">
                    <Spinner />
                    <span className="text-sm font-medium">Comprobando sesion...</span>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <AuthScreen
                onSignIn={handleSignIn}
                isSigningIn={isSigningIn}
                errorMessage={authError}
            />
        );
    }

    const currentUserName = currentUser.displayName || 'Invitado';

    return (
        <Gallery
            userId="lasher"
            currentUserName={currentUserName}
            isAdmin={isAdmin}
            onSignOut={handleSignOut}
        />
    );
};

export default App;
