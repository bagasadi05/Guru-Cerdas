import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MotionDiv } from '../ui/MotionComponents';
import { useAuth } from '../../hooks/useAuth';
import { GraduationCapIcon, UsersIcon } from '../Icons';
import { pageVariants } from '../../utils/animations';

const RoleSelectionPage: React.FC = () => {
    const { session, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // If a teacher session exists, redirect directly to the dashboard
        if (!loading && session) {
            navigate('/dashboard', { replace: true });
        }
    }, [session, loading, navigate]);

    // Show a loader while checking auth state to prevent flashing the selection page
    if (loading || session) {
        return (
            <div className="flex items-center justify-center h-screen cosmic-bg">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <MotionDiv
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-screen w-full overflow-y-auto bg-white dark:bg-gray-900"
        >
            {/* Background Orb */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
                <div className="holographic-orb-container">
                    <div className="holographic-orb">
                        <div className="orb-glow"></div>
                        <div className="orb-core"></div>
                        <div className="orb-ring orb-ring-1"></div>
                        <div className="orb-ring orb-ring-2"></div>
                    </div>
                </div>
            </div>

            <div className="min-h-full flex items-center justify-center p-4 sm:p-6 relative z-10">
                <div className="w-full max-w-4xl text-center py-6 sm:py-8">
                    <img src="/logo_sekolah.png" alt="Logo MI Al Irsyad" className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mx-auto mb-3 sm:mb-5 object-contain animate-fade-in drop-shadow-lg" />
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 text-shadow-md animate-fade-in font-display-serif">
                        Portal MI Al Irsyad
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-emerald-200 mb-6 sm:mb-10 max-w-xl mx-auto animate-fade-in animation-delay-200">
                        Sistem informasi akademik dan manajemen kelas MI Al Irsyad Kota Madiun.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 animate-fade-in-up animation-delay-400 max-w-3xl mx-auto">
                        {/* Teacher Card */}
                        <div className="group">
                            <div className="login-card !m-0 mx-auto h-full p-5 sm:p-7 md:p-8 transition-all duration-200 group-hover:border-emerald-500 dark:group-hover:border-emerald-400 dark:group-hover:shadow-emerald-500/30 active:scale-[0.99] flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-center mb-4 sm:mb-6">
                                        <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-500/20 dark:to-emerald-600/20 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-white/10 transition-transform group-hover:scale-110 shadow-md">
                                            <GraduationCapIcon className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    </div>
                                    <h2 className="form-title text-lg sm:text-xl mb-1.5 sm:mb-2">Saya Seorang Guru</h2>
                                    <p className="form-subtitle text-xs sm:text-sm !mb-5 sm:!mb-6">Akses dasbor untuk mengelola siswa, absensi, jadwal, dan laporan.</p>
                                </div>
                                <Link to="/guru-login" className="form-btn min-h-[44px] flex items-center justify-center font-semibold rounded-xl active:scale-95 transition-all duration-150 cursor-pointer">
                                    Masuk Dasbor Guru
                                </Link>
                            </div>
                        </div>

                        {/* Parent/Student Card */}
                        <div className="group">
                            <div className="login-card !m-0 mx-auto h-full p-5 sm:p-7 md:p-8 transition-all duration-200 group-hover:border-brand-500 dark:group-hover:border-brand-400 dark:group-hover:shadow-brand-600/30 active:scale-[0.99] flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-center mb-4 sm:mb-6">
                                        <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-500/20 dark:to-brand-600/20 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-white/10 transition-transform group-hover:scale-110 shadow-md">
                                            <UsersIcon className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 text-brand-600 dark:text-brand-400" />
                                        </div>
                                    </div>
                                    <h2 className="form-title text-lg sm:text-xl mb-1.5 sm:mb-2">Saya Orang Tua/Siswa</h2>
                                    <p className="form-subtitle text-xs sm:text-sm !mb-5 sm:!mb-6">Lihat perkembangan akademik, kehadiran, dan catatan siswa.</p>
                                </div>
                                <Link to="/portal-login" className="form-btn min-h-[44px] flex items-center justify-center font-semibold rounded-xl active:scale-95 transition-all duration-150 cursor-pointer">
                                    Masuk Portal Siswa
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MotionDiv>
    );
};

export default RoleSelectionPage;
