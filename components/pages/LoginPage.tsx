import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MailIcon, LockIcon, UserCircleIcon, EyeIcon, EyeOffIcon } from '../Icons';
import { loginSchema, signupSchema, LoginFormValues, SignupFormValues } from './login/schemas';

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
            const { error } = await login(data.email, data.password);
            if (error) throw error;
        } catch (err: any) {
            toast.error(err.message || 'Gagal untuk login.');
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
        } catch (err: any) {
            toast.error(err.message || 'Gagal untuk mendaftar.');
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
        } catch (err: any) {
            toast.error(err.message || 'Gagal mengirim email pemulihan.');
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
            <div className="h-screen w-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-center min-h-full p-4 animate-page-transition">
                    <div className="login-card">

                        <h1 className="form-title">
                            {isLoginMode ? 'Selamat Datang Kembali' : 'Buat Akun Guru'}
                        </h1>
                        <p className="form-subtitle">
                            {isLoginMode ? 'Masuk untuk melanjutkan ke Portal Guru' : 'Satu langkah lagi menuju kelas digital Anda.'}
                        </p>

                        {isLoginMode ? (
                            <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
                                <div className="form-group-icon">
                                    <MailIcon className="icon h-5 w-5" />
                                    <Input
                                        type="email"
                                        placeholder="Email"
                                        {...registerLogin('email')}
                                        error={errorsLogin.email?.message}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="form-group-icon relative">
                                    <LockIcon className="icon h-5 w-5" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        {...registerLogin('password')}
                                        error={errorsLogin.password?.message}
                                        className="pl-10 pr-10"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 z-10">
                                        {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>

                                <button type="submit" className="form-btn" disabled={loading}>
                                    {loading ? 'Memproses...' : 'Masuk'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmitSignup(onSignupSubmit)} className="space-y-4">
                                <div className="form-group-icon">
                                    <UserCircleIcon className="icon h-5 w-5" />
                                    <Input
                                        type="text"
                                        placeholder="Nama Lengkap"
                                        {...registerSignup('name')}
                                        error={errorsSignup.name?.message}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="form-group-icon">
                                    <MailIcon className="icon h-5 w-5" />
                                    <Input
                                        type="email"
                                        placeholder="Email"
                                        {...registerSignup('email')}
                                        error={errorsSignup.email?.message}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="form-group-icon relative">
                                    <LockIcon className="icon h-5 w-5" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        {...registerSignup('password')}
                                        error={errorsSignup.password?.message}
                                        className="pl-10 pr-10"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 z-10">
                                        {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                                <div className="form-group-icon relative">
                                    <LockIcon className="icon h-5 w-5" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Konfirmasi Password"
                                        {...registerSignup('confirmPassword')}
                                        error={errorsSignup.confirmPassword?.message}
                                        className="pl-10 pr-10"
                                    />
                                </div>

                                <button type="submit" className="form-btn" disabled={loading}>
                                    {loading ? 'Memproses...' : 'Daftar'}
                                </button>
                            </form>
                        )}

                        <div className="form-links">
                            <button type="button" onClick={toggleMode}>
                                {isLoginMode ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
                            </button>
                            {isLoginMode && <button type="button" onClick={() => setIsForgotModalOpen(true)}>Lupa password?</button>}
                        </div>

                        <div className="text-center mt-6 border-t border-gray-200 dark:border-white/10 pt-4">
                            <Link to="/" className="form-links a">
                                Kembali ke pemilihan peran
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <Modal title="Lupa Password" isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)}>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Masukkan alamat email Anda. Kami akan mengirimkan tautan untuk mengatur ulang password Anda.</p>
                    <div><label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><Input type="email" id="forgot-email" placeholder="Email terdaftar Anda" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} /></div>
                    <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={() => setIsForgotModalOpen(false)} disabled={forgotLoading}>Batal</Button><Button type="submit" disabled={forgotLoading}>{forgotLoading ? 'Mengirim...' : 'Kirim Tautan'}</Button></div>
                </form>
            </Modal>
        </>
    );
};

export default LoginPage;