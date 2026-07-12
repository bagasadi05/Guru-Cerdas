import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { pageVariants } from '../../utils/animations';
import { authSecurity } from '../../services/AuthSecurityService';
import { Input } from '../ui/Input';
import { AlertCircleIcon, ArrowRightIcon, LightbulbIcon, ShieldIcon } from '../Icons';

const PortalLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lockedOut, setLockedOut] = useState(false);
    const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

    useEffect(() => {
        const checkLockoutStatus = async () => {
            const status = await authSecurity.isAccountLocked('parent_portal_client');
            if (status.locked) {
                setLockedOut(true);
                setLockoutTimeLeft(status.remainingTime);
                setError(`Terlalu banyak percobaan masuk yang gagal. Portal dikunci sementara selama ${authSecurity.formatLockoutTime(status.remainingTime)}.`);
            } else {
                setLockedOut(false);
                setLockoutTimeLeft(0);
            }
        };

        checkLockoutStatus();
    }, []);

    // Countdown timer for lockout
    useEffect(() => {
        if (!lockedOut || lockoutTimeLeft <= 0) return;

        const interval = setInterval(() => {
            setLockoutTimeLeft(prev => {
                if (prev <= 1000) {
                    clearInterval(interval);
                    setLockedOut(false);
                    setError(null);
                    return 0;
                }
                const newTime = prev - 1000;
                setError(`Terlalu banyak percobaan masuk yang gagal. Portal dikunci sementara selama ${authSecurity.formatLockoutTime(newTime)}.`);
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [lockedOut, lockoutTimeLeft]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const code = accessCode.trim();

        if (!code) {
            setError("Kode akses tidak boleh kosong.");
            setLoading(false);
            return;
        }

        // Check lockout first
        const lockoutStatus = await authSecurity.isAccountLocked('parent_portal_client');
        if (lockoutStatus.locked) {
            setError(`Terlalu banyak percobaan masuk yang gagal. Portal dikunci sementara selama ${authSecurity.formatLockoutTime(lockoutStatus.remainingTime)}.`);
            setLoading(false);
            return;
        }

        // Use the dedicated RPC function for verifying the access code.
        // This is more secure and reliable, especially if RLS is active.
        const { data: students, error: rpcError } = await supabase
            .rpc('verify_access_code', {
                access_code_param: code
            });

        if (rpcError) {
            console.error("Supabase portal login RPC error:", rpcError);
            setError("Gagal memverifikasi kode. Ini mungkin disebabkan oleh konfigurasi database (RLS/Functions). Pastikan fungsi di Supabase sudah benar.");
            setLoading(false);
            return;
        }

        if (!students || students.length === 0) {
            // Failed attempt: record it
            const lockoutResult = await authSecurity.recordFailedAttempt('parent_portal_client');
            setLoading(false);
            if (lockoutResult.locked) {
                setLockedOut(true);
                setLockoutTimeLeft(15 * 60 * 1000); // 15 mins default
                setError(`Terlalu banyak percobaan masuk yang gagal. Portal dikunci selama 15 menit.`);
            } else {
                setError(`Kode akses tidak valid. Sisa percobaan: ${lockoutResult.remainingAttempts}`);
            }
            return;
        }

        if (students.length > 1) {
            // The RPC might handle this, but we add a client-side check for safety.
            setError("Ditemukan beberapa siswa dengan kode akses yang mirip. Harap hubungi guru Anda untuk kode yang unik.");
            setLoading(false);
            return;
        }

        const student = students[0];

        // Success: clear lockout and store code
        await authSecurity.clearLockout('parent_portal_client');
        setLoading(false);

        // The RPC returns the correctly-cased access code from the database.
        // We must store *this* code in the session, not the user's input,
        // to ensure case-sensitive functions on the next page work correctly.
        sessionStorage.setItem('portal_access_code', student.access_code!);
        navigate(`/portal/${student.id}`);
    };


    const handleFocus = () => document.body.setAttribute('data-focused', 'true');
    const handleBlur = () => document.body.setAttribute('data-focused', 'false');

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-[100dvh] w-full bg-gray-950 text-gray-100 flex flex-col justify-center relative overflow-x-hidden py-10 lg:py-0"
        >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-gray-950 to-gray-950 z-0"></div>
            <div className="absolute -left-64 top-1/4 w-[800px] h-[800px] bg-primary-600/10 blur-[120px] rounded-full z-0 pointer-events-none"></div>

            <div className="flex flex-col-reverse lg:flex-row items-center lg:items-stretch justify-center w-full max-w-6xl z-10 px-4 sm:px-6 gap-12 lg:gap-20 mx-auto mt-auto mb-auto">
                
                {/* Left side text */}
                <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto lg:mx-0 w-full mt-8 lg:mt-0 text-center lg:text-left">
                    <div className="mb-4 flex flex-col items-center lg:items-start">
                        <span className="hidden lg:block text-6xl font-serif text-primary-500 leading-none mb-2">"</span>
                        <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight text-white mb-4 lg:mb-6 leading-tight font-display">
                            Setiap anak adalah<br/>
                            <span className="text-primary-500">bintang</span> yang unik,<br/>
                            bersinar dengan <span className="text-primary-500">cahayanya.</span>
                        </h2>
                        <p className="text-gray-400 text-sm lg:text-base mb-6 lg:mb-8 max-w-md leading-relaxed mx-auto lg:mx-0">
                            Pantau perkembangan dan temukan<br/>
                            potensi terbaik buah hati Anda bersama kami.<br/>
                            Karena setiap langkah kecil sangat berarti.
                        </p>
                        <div className="w-12 h-0.5 bg-primary-600/50 mb-8 lg:mb-10 mx-auto lg:mx-0"></div>
                        
                        <div className="flex items-center gap-3 sm:gap-4 bg-gray-900/60 border border-gray-800 p-3 sm:p-4 rounded-2xl backdrop-blur-sm max-w-md text-left w-full sm:w-auto">
                            <div className="p-2 sm:p-3 bg-primary-950/50 rounded-xl shrink-0">
                                <LightbulbIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed">
                                Kolaborasi guru dan orang tua adalah<br className="hidden sm:block"/>
                                kunci keberhasilan masa depan anak.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right side form */}
                <div className="flex-1 flex items-center justify-center w-full pt-4 lg:pt-0">
                    <div className="login-card !m-0 w-full max-w-md !bg-[#151921] !border-gray-800/60 backdrop-blur-xl shadow-2xl relative p-6 sm:p-8 overflow-hidden">
                        
                        {/* We can keep the holographic orb here for a nice touch */}
                        <div className="holographic-orb-container absolute -top-12 -right-12 opacity-40 pointer-events-none scale-75">
                            <div className="holographic-orb">
                                <div className="orb-glow"></div>
                                <div className="orb-core"></div>
                                <div className="orb-ring orb-ring-1"></div>
                                <div className="orb-ring orb-ring-2"></div>
                            </div>
                        </div>

                        <img src="/logo_sekolah.png" alt="Logo MI Al Irsyad" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 object-contain drop-shadow-md relative z-10" />
                        
                        <h1 className="text-2xl font-bold text-center text-white mb-2 font-display relative z-10">
                            Portal <span className="text-primary-500">Siswa & Orang Tua</span>
                        </h1>
                        <p className="text-gray-400 text-sm text-center mb-8 relative z-10">
                            Masukkan kode akses 6 digit dari guru Anda.
                        </p>

                        <form onSubmit={handleSubmit} className="relative z-10">
                            <div className="form-group-icon">
                                <Input
                                    type="text"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                    placeholder="KODE AKSES"
                                    required
                                    value={accessCode}
                                    onChange={e => setAccessCode(e.target.value.toUpperCase())}
                                    onFocus={handleFocus}
                                    onBlur={handleBlur}
                                    aria-label="Kode Akses"
                                    autoComplete="off"
                                    spellCheck="false"
                                    disabled={lockedOut}
                                    maxLength={6}
                                    className="text-center font-bold tracking-[0.3em] uppercase disabled:opacity-50 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                    style={{ paddingLeft: '15px', paddingRight: '15px' }}
                                />
                            </div>

                            {error && (
                                <p className="flex items-center justify-center gap-1 text-xs text-rose-600 dark:text-rose-400 animate-fade-in mt-4 mb-2" role="alert">
                                    <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="text-center">{error}</span>
                                </p>
                            )}

                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6" disabled={loading || lockedOut}>
                                {loading ? 'Memverifikasi...' : (
                                    <>
                                        Masuk <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                        
                        <div className="relative flex py-6 items-center z-10">
                            <div className="flex-grow border-t border-gray-800"></div>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs mt-2 mb-4 z-10 relative">
                            <ShieldIcon className="w-3.5 h-3.5" />
                            <span>Aman & terpercaya. Data Anda terlindungi.</span>
                        </div>

                        <div className="text-center border-t border-gray-800/60 pt-4 z-10 relative">
                            <Link to="/" className="text-sm text-gray-400 hover:text-primary-400 transition-colors font-medium">
                                Kembali ke pemilihan peran
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PortalLoginPage;