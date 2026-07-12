import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { pushNotificationService } from '../../services/PushNotificationService';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MailIcon, LockIcon, UserCircleIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, LightbulbIcon, ShieldIcon } from '../Icons';
import { loginSchema, signupSchema, LoginFormValues, SignupFormValues } from './login/schemas';
import { pageVariants } from '../../utils/animations';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, signup, session } = useAuth();
    const toast = useToast();

    const [formMode, setFormMode] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // Login Form
    const { register: registerLogin, handleSubmit: handleSubmitLogin, formState: { errors: errorsLogin }, reset: resetLogin } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    // Signup Form
    const { register: registerSignup, handleSubmit: handleSubmitSignup, formState: { errors: errorsSignup }, reset: resetSignup } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
    });

    useEffect(() => {
        if (session) {
            navigate('/dashboard', { replace: true });
        }
    }, [session, navigate]);

    const onLoginSubmit = async (data: LoginFormValues) => {
        setLoading(true);
        try {
            let loginEmail = data.email.trim();
            if (!loginEmail.includes('@')) {
                loginEmail = `${loginEmail}@guru.local`;
            }
            const response = await login(loginEmail, data.password);
            if (response.error) throw response.error;
            
            // Otomatis meminta izin notifikasi setelah login berhasil
            if (response.data?.user) {
                try {
                    await pushNotificationService.enable(response.data.user.id);
                } catch (pushErr) {
                    console.warn("Auto push subscription failed:", pushErr);
                    // Kita tidak melempar error di sini agar login tetap sukses meskipun notif ditolak
                }
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Gagal untuk login.');
        } finally {
            setLoading(false);
        }
    };

    const onSignupSubmit = async (data: SignupFormValues) => {
        setLoading(true);
        try {
            const response = await signup(data.name, data.email, data.password);
            if (response.error) throw response.error;
            if (response.data.user) {
                toast.success('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi.');
                setFormMode('login');
                resetSignup();
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Gagal untuk mendaftar.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                redirectTo: window.location.origin + '/',
            });
            if (error) throw error;
            toast.success(`Email pemulihan telah dikirim ke ${forgotEmail}. Silakan periksa kotak masuk Anda.`);
            setIsForgotModalOpen(false);
            setForgotEmail('');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Gagal mengirim email pemulihan.');
        } finally {
            setForgotLoading(false);
        }
    };

    const isLoginMode = formMode === 'login';

    const toggleMode = () => {
        setFormMode(isLoginMode ? 'signup' : 'login');
        resetLogin();
        resetSignup();
    };

    return (
        <>
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
                                Mengajar adalah<br/>
                                menyalakan <span className="text-primary-500">obor,</span><br/>
                                bukan <span className="text-primary-500">mengisi bejana.</span>
                            </h2>
                            <p className="text-gray-400 text-sm lg:text-base mb-6 lg:mb-8 max-w-md leading-relaxed mx-auto lg:mx-0">
                                Teruslah belajar, berbagi, dan menginspirasi.<br/>
                                Karena guru hebat, lahir dari semangat<br/>
                                yang tak pernah berhenti.
                            </p>
                            <div className="w-12 h-0.5 bg-primary-600/50 mb-8 lg:mb-10 mx-auto lg:mx-0"></div>
                            
                            <div className="flex items-center gap-3 sm:gap-4 bg-gray-900/60 border border-gray-800 p-3 sm:p-4 rounded-2xl backdrop-blur-sm max-w-md text-left w-full sm:w-auto">
                                <div className="p-2 sm:p-3 bg-primary-950/50 rounded-xl shrink-0">
                                    <LightbulbIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed">
                                    Setiap langkah kecil hari ini,<br className="hidden sm:block"/>
                                    membentuk perubahan besar untuk masa depan.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right side form */}
                    <div className="flex-1 flex items-center justify-center w-full pt-4 lg:pt-0">
                        <div className="login-card !m-0 w-full max-w-md !bg-[#151921] !border-gray-800/60 backdrop-blur-xl shadow-2xl relative p-6 sm:p-8">
                            <img src="/logo_sekolah.png" alt="Logo MI Al Irsyad" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 object-contain drop-shadow-md" />
                            <h1 className="text-2xl font-bold text-center text-white mb-2 font-display">
                                <span className="text-primary-500">{isLoginMode ? 'Selamat' : 'Mari'}</span> {isLoginMode ? 'Datang Kembali!' : 'Bergabung!'}
                            </h1>
                            <p className="text-gray-400 text-sm text-center mb-8">
                                {isLoginMode ? 'Masuk untuk melanjutkan ke Portal Guru' : 'Satu langkah lagi menuju kelas digital Anda.'}
                            </p>

                            {isLoginMode ? (
                                <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
                                    <div className="form-group-icon">
                                        <MailIcon className="icon h-5 w-5 text-gray-400" />
                                        <Input
                                            type="text"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            placeholder="Email atau Username (cth: guru1)"
                                            {...registerLogin('email')}
                                            error={errorsLogin.email?.message}
                                            className="pl-10 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div className="form-group-icon relative">
                                        <LockIcon className="icon h-5 w-5 text-gray-400" />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Password"
                                            {...registerLogin('password')}
                                            error={errorsLogin.password?.message}
                                            className="pl-10 pr-10 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-300 z-10"
                                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                        >
                                            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-2 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="checkbox" className="rounded border-gray-600 bg-gray-800/50 text-primary-500 focus:ring-primary-500/50 focus:ring-offset-gray-900 cursor-pointer" />
                                            <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">Ingat saya</span>
                                        </label>
                                        <button type="button" onClick={() => setIsForgotModalOpen(true)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                                            Lupa password?
                                        </button>
                                    </div>

                                    <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-4" disabled={loading}>
                                        {loading ? 'Memproses...' : (
                                            <>
                                                Masuk <ArrowRightIcon className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSubmitSignup(onSignupSubmit)} className="space-y-4">
                                    <div className="form-group-icon">
                                        <UserCircleIcon className="icon h-5 w-5 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Nama Lengkap"
                                            {...registerSignup('name')}
                                            error={errorsSignup.name?.message}
                                            className="pl-10 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div className="form-group-icon">
                                        <MailIcon className="icon h-5 w-5 text-gray-400" />
                                        <Input
                                            type="email"
                                            inputMode="email"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            placeholder="Email"
                                            {...registerSignup('email')}
                                            error={errorsSignup.email?.message}
                                            className="pl-10 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div className="form-group-icon relative">
                                        <LockIcon className="icon h-5 w-5 text-gray-400" />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Password"
                                            {...registerSignup('password')}
                                            error={errorsSignup.password?.message}
                                            className="pl-10 pr-10 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-300 z-10"
                                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                        >
                                            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <div className="form-group-icon relative">
                                        <LockIcon className="icon h-5 w-5 text-gray-400" />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Konfirmasi Password"
                                            {...registerSignup('confirmPassword')}
                                            error={errorsSignup.confirmPassword?.message}
                                            className="pl-10 pr-10 bg-gray-900/50 border-gray-700/50 focus:border-primary-500/50 text-white placeholder-gray-500"
                                        />
                                    </div>

                                    <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-4" disabled={loading}>
                                        {loading ? 'Memproses...' : (
                                            <>
                                                Daftar <ArrowRightIcon className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                            
                            <div className="relative flex py-6 items-center">
                                <div className="flex-grow border-t border-gray-800"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">atau</span>
                                <div className="flex-grow border-t border-gray-800"></div>
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={toggleMode}
                                className="w-full bg-transparent border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mb-6"
                            >
                                <UserCircleIcon className="w-4 h-4 text-gray-400" />
                                {isLoginMode ? (
                                    <>Belum punya akun? <span className="text-primary-400">Daftar di sini</span></>
                                ) : (
                                    <>Sudah punya akun? <span className="text-primary-400">Masuk di sini</span></>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs mt-6 mb-4">
                                <ShieldIcon className="w-3.5 h-3.5" />
                                <span>Aman & terpercaya. Data Anda terlindungi.</span>
                            </div>

                            <div className="text-center border-t border-gray-800/60 pt-4">
                                <Link to="/" className="text-sm text-gray-400 hover:text-primary-400 transition-colors font-medium">
                                    Kembali ke pemilihan peran
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <Modal title="Lupa Password" isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)}>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Masukkan alamat email Anda. Kami akan mengirimkan tautan untuk mengatur ulang password Anda.</p>
                    <div><label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><Input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" id="forgot-email" placeholder="Email terdaftar Anda" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} /></div>
                    <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={() => setIsForgotModalOpen(false)} disabled={forgotLoading}>Batal</Button><Button type="submit" disabled={forgotLoading}>{forgotLoading ? 'Mengirim...' : 'Kirim Tautan'}</Button></div>
                </form>
            </Modal>
        </>
    );
};

export default LoginPage;