import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import AuthScreen from './components/AuthScreen';
import Gallery from './components/Gallery';
import Spinner from './components/Spinner';
import { signInWithGoogle, signOutCurrentUser, subscribeToAuthChanges } from './services/firebase';

const getAuthErrorMessage = (error: unknown): string => {
    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    switch (code) {
        case 'auth/popup-closed-by-user':
            return 'Has cerrado la ventana de acceso antes de completar el login.';
        case 'auth/popup-blocked':
            return 'El navegador ha bloqueado la ventana emergente. Permite popups e intentalo de nuevo.';
        case 'auth/unauthorized-domain':
            return 'Este dominio no esta autorizado en Firebase Authentication. Anade el dominio actual en la consola de Firebase.';
        case 'auth/operation-not-allowed':
            return 'El proveedor de Google no esta habilitado en Firebase Authentication.';
        default:
            return 'No se pudo iniciar sesion. Revisa la configuracion de Firebase Authentication.';
    }
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((user) => {
            setCurrentUser(user);
            setIsAuthReady(true);
        });

        return unsubscribe;
    }, []);

    const handleSignIn = async () => {
        setIsSigningIn(true);
        setAuthError(null);

        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Error signing in with Google:', error);
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

    return (
        <Gallery
            userId="lasher"
            currentUserName={currentUser.displayName || currentUser.email || 'Invitado'}
            onSignOut={handleSignOut}
        />
    );
};

export default App;
