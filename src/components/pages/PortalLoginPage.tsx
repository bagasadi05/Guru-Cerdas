import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { pageVariants } from '../../utils/animations';
import { authSecurity } from '../../services/AuthSecurityService';
import { Input } from '../ui/Input';
import { AlertCircleIcon } from '../Icons';

const PortalLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lockedOut, setLockedOut] = useState(false);
    const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

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

    useEffect(() => {
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
            className="h-screen w-full overflow-y-auto bg-gray-50 dark:bg-gray-900"
        >
            <div className="flex items-center justify-center min-h-full p-4 animate-page-transition">
                <div className="login-card">
                    <div className="holographic-orb-container">
                        <div className="holographic-orb">
                            <div className="orb-glow"></div>
                            <div className="orb-core"></div>
                            <div className="orb-ring orb-ring-1"></div>
                            <div className="orb-ring orb-ring-2"></div>
                        </div>
                    </div>

                    <h1 className="form-title">Portal Orang Tua</h1>
                    <p className="form-subtitle">
                        Masukkan kode akses yang diberikan oleh guru Anda.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group-icon">
                            <Input
                                type="text"
                                placeholder="KODE AKSES"
                                required
                                value={accessCode}
                                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                aria-label="Kode Akses"
                                autoCapitalize="characters"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                disabled={lockedOut}
                                maxLength={6}
                                className="text-center font-bold tracking-[0.3em] uppercase disabled:opacity-50"
                                style={{ paddingLeft: '15px', paddingRight: '15px' }}
                            />
                        </div>

                        {error && (
                            <p className="flex items-center justify-center gap-1 text-xs text-rose-600 dark:text-rose-400 animate-fade-in mb-4" role="alert">
                                <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                {error}
                            </p>
                        )}

                        <button type="submit" className="form-btn" disabled={loading || lockedOut}>
                            {loading ? 'Memverifikasi...' : 'Lanjutkan'}
                        </button>
                    </form>

                    <div className="text-center mt-6 border-t border-white/10 pt-4">
                        <Link to="/" className="form-links a">
                            Kembali ke pemilihan peran
                        </Link>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PortalLoginPage;