import React, { useState } from 'react';

interface AuthScreenProps {
    onSignIn: (email: string, password: string) => Promise<void> | void;
    isSigningIn: boolean;
    errorMessage: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, isSigningIn, errorMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSignIn(email, password);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f6efe6] text-neutral-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(203,120,56,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(118,82,53,0.18),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.55),_rgba(255,255,255,0))]" />
            <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[#d7b79a]/30 blur-3xl" />
            <div className="absolute bottom-10 right-[-5rem] h-80 w-80 rounded-full bg-[#b76e4d]/20 blur-3xl" />

            <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 md:px-10">
                <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <section className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-neutral-500">Galeria privada</p>
                        <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-neutral-950 md:text-7xl">
                            Las fotos solo se ven con sesion iniciada.
                        </h1>
                        <p className="mt-6 max-w-lg text-base leading-7 text-neutral-700 md:text-lg">
                            Entra con tu email y la clave compartida para acceder a la galeria de Alberto y Mariona, ver los recuerdos compartidos y subir nuevos momentos del dia.
                        </p>
                    </section>

                    <section className="max-w-xl rounded-[32px] border border-white/60 bg-white/85 p-7 shadow-[0_28px_80px_rgba(93,63,39,0.16)] backdrop-blur md:p-9">
                        <div className="rounded-[28px] bg-neutral-950 px-5 py-4 text-white">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Acceso</p>
                            <p className="mt-2 text-2xl font-semibold tracking-tight">Inicia sesion para entrar</p>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                El email puede ser cualquiera. La clave compartida de la galeria es necesaria para desbloquear el acceso.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="gallery-email" className="mb-2 block text-sm font-semibold text-neutral-900">Email</label>
                                <input
                                    id="gallery-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#b76e4d] focus:ring-2 focus:ring-[#b76e4d]/20"
                                    autoComplete="email"
                                    disabled={isSigningIn}
                                />
                            </div>
                            <div>
                                <label htmlFor="gallery-password" className="mb-2 block text-sm font-semibold text-neutral-900">Clave</label>
                                <input
                                    id="gallery-password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Introduce la clave"
                                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#b76e4d] focus:ring-2 focus:ring-[#b76e4d]/20"
                                    autoComplete="current-password"
                                    disabled={isSigningIn}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSigningIn}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#b76e4d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#9f5f41] focus:outline-none focus:ring-2 focus:ring-[#b76e4d] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                            >
                                <span>{isSigningIn ? 'Abriendo acceso...' : 'Entrar en la galeria'}</span>
                            </button>
                        </form>

                        {errorMessage && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        )}

                        <div className="mt-6 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                                <p className="font-semibold text-neutral-900">Contenido protegido</p>
                                <p className="mt-1 leading-6">Sin login no se renderiza la galeria ni se permite leer Storage.</p>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                                <p className="font-semibold text-neutral-900">Acceso rapido</p>
                                <p className="mt-1 leading-6">Una vez dentro, podras navegar, descargar y subir fotos como antes.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AuthScreen;