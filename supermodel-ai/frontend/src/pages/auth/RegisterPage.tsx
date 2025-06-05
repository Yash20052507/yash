// src/pages/auth/RegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { ApiError, RegisterPayload } from '../../types';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }).max(30, {message: "Username must be 30 characters or less."}),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100, {message: "Password must be 100 characters or less."}),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authStoreIsLoading, error: authStoreError } = useAuthStore();

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const { register, handleSubmit, formState: { errors, isSubmitting: formIsSubmitting } } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (formData) => {
    setApiError(null);
    setIsSuccess(false);
    const payload: RegisterPayload = {
        email: formData.email,
        username: formData.username,
        password: formData.password
    };
    try {
      const response = await authService.register(payload);
      if (response.success) {
        setIsSuccess(true);
      } else {
        setApiError(response.error || response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
        if (err instanceof ApiError) {
            setApiError(err.message);
        } else if (err.message) {
            setApiError(err.message);
        } else {
            setApiError('An unexpected error occurred during registration.');
        }
    }
  };

  // Prioritize API error, then form errors
  const displayError = apiError || authStoreError || errors.username?.message || errors.email?.message || errors.password?.message || errors.confirmPassword?.message;
  const isLoading = formIsSubmitting || authStoreIsLoading;

  if (isSuccess) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Registration Successful!</h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto my-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Your account has been created. You can now sign in.
            </p>
            <Link
                to="/auth/login"
                className="mt-6 inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
            >
                Go to Login
            </Link>
        </div>
    );
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-center text-neutral-900 dark:text-white">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5"> {/* Reduced space-y for tighter form */}
        {displayError && (
             <div className="rounded-md bg-red-50 dark:bg-red-800 border border-red-200 dark:border-red-700 p-3">
                <p className="text-sm text-red-700 dark:text-red-100">{displayError}</p>
            </div>
        )}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Username</label>
          <input id="username" type="text" {...register("username")} autoComplete="username" className={`mt-1 block w-full appearance-none rounded-md border px-3 py-2 shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none sm:text-sm ${errors.username ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400'}`} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email address</label>
          <input id="email" type="email" autoComplete="email" {...register("email")} className={`mt-1 block w-full appearance-none rounded-md border px-3 py-2 shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none sm:text-sm ${errors.email ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400'}`} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
          <div className="mt-1 relative">
            <input id="password" type={showPassword ? "text" : "password"} {...register("password")} autoComplete="new-password" className={`block w-full appearance-none rounded-md border px-3 py-2 shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none sm:text-sm ${errors.password ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400'}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
            </button>
          </div>
        </div>
         <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Confirm Password</label>
          <div className="mt-1 relative">
            <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword")} autoComplete="new-password" className={`block w-full appearance-none rounded-md border px-3 py-2 shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none sm:text-sm ${errors.confirmPassword ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400'}`} />
             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
            </button>
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </div>
      </form>
    </>
  );
};

export default RegisterPage;
