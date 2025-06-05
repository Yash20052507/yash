// src/pages/auth/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { ApiError } from '../../types';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, { message: "Email or Username is required" }),
  password: z.string().min(1, { message: "Password is required" }), // Min 1 for presence, backend validates length
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: storeLoginAction, isAuthenticated, error: authStoreError, isLoading: authStoreIsLoading } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting: formIsSubmitting } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setApiError(null);
    try {
      // Determine if email or username based on content (simple check)
      // Backend should ideally handle both in one field or have separate fields if strict
      const loginPayload = data.emailOrUsername.includes('@')
        ? { email: data.emailOrUsername, password: data.password }
        : { email_or_username: data.emailOrUsername, password: data.password };


      const response = await authService.login(loginPayload);
      if (response.success && response.data?.token) {
        await storeLoginAction(response.data.token); // Pass token to store's login method
        // Successful login will trigger useEffect above or AuthLayout redirect
      } else {
        // Use error from response if available
        setApiError(response.error || response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
        if (err instanceof ApiError) { // Custom ApiError from apiClient
            setApiError(err.message);
        } else if (err.message) { // Standard Error
            setApiError(err.message);
        }
         else {
            setApiError('An unexpected error occurred during login.');
        }
    }
  };

  const displayError = apiError || authStoreError || errors.emailOrUsername?.message || errors.password?.message;
  const isLoading = formIsSubmitting || authStoreIsLoading;

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-center text-neutral-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Or{' '}
          <Link to="/auth/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            create a new account
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        {displayError && (
          <div className="rounded-md bg-red-50 dark:bg-red-800 border border-red-200 dark:border-red-700 p-3">
            <p className="text-sm text-red-700 dark:text-red-100">{displayError}</p>
          </div>
        )}
        <div>
          <label htmlFor="emailOrUsername" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Email or Username
          </label>
          <div className="mt-1">
            <input
              id="emailOrUsername"
              type="text"
              autoComplete="username"
              {...register("emailOrUsername")}
              className={`block w-full appearance-none rounded-md border px-3 py-2 shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none sm:text-sm
                          ${errors.emailOrUsername || (apiError && apiError.toLowerCase().includes('credential')) // Highlight on general credential error
                            ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400'}`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Password
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              className={`block w-full appearance-none rounded-md border px-3 py-2 shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none sm:text-sm
                          ${errors.password || (apiError && apiError.toLowerCase().includes('credential'))
                            ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400'}`}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                title={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end"> {/* Moved forgot password to the right */}
          <div className="text-sm">
            <Link to="#" onClick={(e) => { e.preventDefault(); alert("Forgot password functionality not implemented yet.");}} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </>
  );
};

export default LoginPage;
