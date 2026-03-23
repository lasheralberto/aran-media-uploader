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
    const [isLandingImageLoaded, setIsLandingImageLoaded] = useState(false);
    const [hasEntered, setHasEntered] = useState(false);

    useEffect(() => {
        const enterTimeout = window.setTimeout(() => {
            setHasEntered(true);
        }, 80);

        return () => {
            window.clearTimeout(enterTimeout);
        };
    }, []);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSignIn(password);
    };

    useEffect(() => {
        let isMounted = true;

        const loadLandingImage = async () => {
            const imageUrl = await getLandingImageUrl();

            if (!imageUrl) {
                if (isMounted) {
                    setLandingImageUrl(null);
                    setIsLandingImageLoaded(false);
                }
                return;
            }

            if (isMounted) {
                setLandingImageUrl(imageUrl);
                setIsLandingImageLoaded(false);
            }

            const image = new Image();
            image.decoding = 'async';
            image.src = imageUrl;

            const handleImageReady = () => {
                if (!isMounted) {
                    return;
                }

                setIsLandingImageLoaded(true);
            };

            image.onload = handleImageReady;

            try {
                await image.decode();
                handleImageReady();
            } catch {
                image.onerror = () => {
                    if (isMounted) {
                        setLandingImageUrl(imageUrl);
                        setIsLandingImageLoaded(false);
                    }
                };
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

            <main className={`relative min-h-screen transition-opacity duration-1000 ease-out lg:grid lg:grid-cols-[0.95fr_0.85fr] ${hasEntered ? 'opacity-100' : 'opacity-0'}`}>
                <section className="absolute inset-0 overflow-hidden lg:relative lg:flex lg:min-h-screen lg:items-end lg:px-10 lg:py-10">
                    <div className="absolute inset-0 rounded-none lg:rounded-r-[40px] lg:rounded-l-none">
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.68),_rgba(220,206,190,0.82))]" />

                        {landingImageUrl ? (
                            <img
                                src={landingImageUrl}
                                alt="Vielha - Val d'Aran"
                                className={`h-full w-full object-cover object-center transition-[filter,transform,opacity] duration-[1400ms] ease-out lg:object-cover ${hasEntered ? 'opacity-100' : 'opacity-0'} ${isLandingImageLoaded ? 'scale-100 blur-0 saturate-100' : 'scale-[1.04] blur-xl saturate-[0.82]'}`}
                                decoding="async"
                                fetchPriority="high"
                            />
                        ) : (
                            <div className="h-full w-full bg-[linear-gradient(180deg,_rgba(255,255,255,0.6),_rgba(218,202,187,0.65))]" />
                        )}

                        {landingImageUrl && (
                            <div className={`absolute inset-0 transition-opacity duration-1000 ease-out ${isLandingImageLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                                <div className="absolute inset-0 backdrop-blur-[10px] bg-white/18" />
                                <div className="absolute inset-x-[18%] top-[14%] h-24 rounded-full bg-white/28 blur-3xl" />
                                <div className="absolute bottom-[12%] left-[12%] h-32 w-32 rounded-full bg-[#d8c3ae]/28 blur-3xl" />
                                <div className="absolute inset-0 animate-pulse bg-[linear-gradient(115deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.18),_rgba(255,255,255,0.05))]" />
                                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f3eee7]/80 to-transparent lg:hidden" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(18,18,18,0.08),_rgba(18,18,18,0.18))] lg:bg-[linear-gradient(90deg,_rgba(18,18,18,0.14),_rgba(18,18,18,0.02))]" />
                        <div className="absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-[#f3eee7] via-[#f3eee7]/68 to-transparent lg:hidden" />
                    </div>

                    <div className={`relative z-10 hidden w-full pb-2 text-white transition-[transform,opacity,filter] duration-[1200ms] ease-out lg:block lg:max-w-[20rem] lg:text-left ${hasEntered ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-5 opacity-0 blur-md'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.44em] text-white/72">Privado</p>
                        <h1 className="mt-4 text-4xl font-semibold leading-[0.9] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                            17.01.26
                            <br />
                            Vielha
                        </h1>
                        <p className="mt-3 text-sm tracking-[0.18em] text-white/76 sm:text-base">
                            Val d&apos;Aran
                        </p>
                    </div>
                </section>

                <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-4 sm:px-6 sm:py-6 lg:min-h-0 lg:px-10 lg:py-10">
                    <div className={`w-full max-w-md rounded-[28px] border border-white/35 bg-white/70 p-2.5 shadow-[0_30px_90px_rgba(32,24,16,0.16)] backdrop-blur-[18px] transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-w-md lg:max-w-[28rem] lg:rounded-[32px] lg:border-black/5 lg:bg-white/72 ${hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <form onSubmit={handleSubmit} className={`rounded-[24px] border border-black/6 bg-white/88 p-4 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:p-5 ${hasEntered ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="mb-3 text-center lg:hidden">
                                <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.08em] text-neutral-950">
                                    AM2026
                                </h2>
                            </div>

                            <div className="group flex items-center gap-3 rounded-[20px] border border-neutral-200/80 bg-[#fbfaf7] px-4 py-1.5 transition focus-within:border-neutral-950/40 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(17,17,17,0.04)]">
                                <div className="h-2 w-2 rounded-full bg-neutral-300 transition group-focus-within:bg-[#b76e4d]" />
                                <input
                                    id="gallery-password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Clave"
                                    className="h-11 w-full border-0 bg-transparent p-0 text-base tracking-[0.02em] text-neutral-950 outline-none placeholder:text-neutral-400"
                                    autoComplete="current-password"
                                    disabled={isSigningIn}
                                />
                            </div>

                            <div className="mt-3">
                                <button
                                    type="submit"
                                    disabled={isSigningIn}
                                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
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