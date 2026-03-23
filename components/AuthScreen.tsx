import React, { useEffect, useState } from 'react';
import { getLandingImageUrl } from '../services/firebase';

interface AuthScreenProps {
    onSignIn: (password: string) => Promise<void> | void;
    isSigningIn: boolean;
    errorMessage: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, isSigningIn, errorMessage }) => {
    const [password, setPassword] = useState('');
    const [landingImageUrl, setLandingImageUrl] = useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSignIn(password);
    };

    useEffect(() => {
        let isMounted = true;

        const loadLandingImage = async () => {
            const imageUrl = await getLandingImageUrl();

            if (isMounted) {
                setLandingImageUrl(imageUrl);
            }
        };

        void loadLandingImage();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f3eee7] text-neutral-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(17,17,17,0.06),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.58),_rgba(243,238,231,0.9))]" />
            <div className="absolute right-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-white/40 blur-3xl" />
            <div className="absolute bottom-[-10rem] left-[40%] h-[24rem] w-[24rem] rounded-full bg-[#d7c5b3]/30 blur-3xl" />

            <main className="relative min-h-screen lg:grid lg:grid-cols-[0.95fr_0.85fr]">
                <section className="relative flex min-h-[54vh] items-end overflow-hidden px-5 pt-5 sm:min-h-[62vh] sm:px-6 lg:min-h-screen lg:px-10 lg:py-10">
                    <div className="absolute inset-0 rounded-none lg:rounded-r-[40px] lg:rounded-l-none">
                        {landingImageUrl ? (
                            <img
                                src={landingImageUrl}
                                alt="Vielha - Val d'Aran"
                                className="h-full w-full object-contain object-center lg:object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-[linear-gradient(180deg,_rgba(255,255,255,0.6),_rgba(218,202,187,0.65))]" />
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(18,18,18,0.08),_rgba(18,18,18,0.18))] lg:bg-[linear-gradient(90deg,_rgba(18,18,18,0.14),_rgba(18,18,18,0.02))]" />
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f3eee7] via-[#f3eee7]/70 to-transparent lg:hidden" />
                    </div>

                    <div className="relative z-10 w-full pb-8 text-center text-white lg:max-w-[20rem] lg:pb-2 lg:text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.44em] text-white/72">Privado</p>
                        <h1 className="mt-4 text-4xl font-semibold leading-[0.9] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                            170126
                            <br />
                            Vielha
                        </h1>
                        <p className="mt-3 text-sm tracking-[0.18em] text-white/76 sm:text-base">
                            Val d&apos;Aran
                        </p>
                    </div>
                </section>

                <section className="relative flex items-center justify-center px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
                    <div className="w-full max-w-[34rem] rounded-[36px] border border-black/5 bg-white/72 p-3 shadow-[0_30px_90px_rgba(32,24,16,0.08)] backdrop-blur-2xl">
                        <form onSubmit={handleSubmit} className="rounded-[28px] border border-black/6 bg-white/88 p-5 md:p-6">
                            <div className="group flex items-center gap-3 rounded-[24px] border border-neutral-200/80 bg-[#fbfaf7] px-5 py-2.5 transition focus-within:border-neutral-950/40 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(17,17,17,0.04)]">
                                <div className="h-2 w-2 rounded-full bg-neutral-300 transition group-focus-within:bg-[#b76e4d]" />
                                <input
                                    id="gallery-password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Clave"
                                    className="h-14 w-full border-0 bg-transparent p-0 text-base tracking-[0.02em] text-neutral-950 outline-none placeholder:text-neutral-400"
                                    autoComplete="current-password"
                                    disabled={isSigningIn}
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-4 border-t border-black/6 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSigningIn}
                                    className="inline-flex min-w-[9.5rem] items-center justify-center gap-2.5 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                                >
                                    {isSigningIn ? (
                                        <>
                                            <span className="relative h-5 w-5">
                                                <span className="absolute inset-0 rounded-full border border-white/20" />
                                                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white/70 animate-spin" />
                                                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                                            </span>
                                            <span>Accediendo...</span>
                                        </>
                                    ) : (
                                        'Acceder'
                                    )}
                                </button>
                            </div>

                            {errorMessage && (
                                <div className="mt-4 rounded-[20px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                                    {errorMessage}
                                </div>
                            )}
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AuthScreen;