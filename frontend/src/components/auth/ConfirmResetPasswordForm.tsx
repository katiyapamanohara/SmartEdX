"use client";

import React, { useState } from "react";
import Link from "next/link";
import Label from "../form/Label";
import { useConfirmResetPassword } from "@/hooks/useResetPassword";

interface ConfirmResetPasswordFormProps {
  token: string;
}

export default function ConfirmResetPasswordForm({ token }: ConfirmResetPasswordFormProps) {
  const [tokenExpired, setTokenExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const { confirmReset, isLoading, error, success, message } = useConfirmResetPassword();

  // Check if token is valid when component loads
  React.useEffect(() => {
    // Basic JWT validation check
    try {
      if (token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.error('Invalid token format: token does not have three parts');
          setTokenExpired(true);
          return;
        }

        // Try to decode the payload
        const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64Payload.length % 4;
        const paddedBase64 = pad ? base64Payload + '='.repeat(4 - pad) : base64Payload;
        
        try {
          const decodedPayload = atob(paddedBase64);
          const payload = JSON.parse(decodedPayload);
          
          console.log('Token payload:', payload);
          
          // Check if the token has an expiration claim
          if (payload.exp) {
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            
            console.log('Token expiration time:', new Date(expirationTime).toISOString());
            console.log('Current time:', new Date(currentTime).toISOString());
            
            if (currentTime > expirationTime) {
              console.error('Token has already expired');
              setTokenExpired(true);
            } else {
              console.log('Token is still valid. Expires in:', Math.round((expirationTime - currentTime) / 1000 / 60), 'minutes');
            }
          }
        } catch (e) {
          console.error('Error parsing token payload:', e);
        }
      }
    } catch (e) {
      console.error('Error validating token:', e);
    }
  }, [token]);

  const validateForm = () => {
    setPasswordError(null);
    
    if (!email.trim()) {
      setPasswordError("Please enter your email address");
      return false;
    }
    
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return false;
    }

    if (!password || !confirmPassword) {
      setPasswordError("Please fill in both password fields");
      return false;
    }
    
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Use the email entered by the user
      await confirmReset(token, password, email);
    } catch (err) {
      // Check if the error contains token expiration message
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes('jwt expired') || 
          errorMessage.toLowerCase().includes('token expired')) {
        setTokenExpired(true);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg
            className="stroke-current"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Reset Your Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your new password below to complete the password reset process.
          </p>
        </div>
        <div>
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                {message}
              </p>
            </div>
          )}
          
          {error && !tokenExpired && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                {passwordError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={tokenExpired ? "opacity-50 pointer-events-none" : ""}>
            <div className="space-y-5">{tokenExpired && <div className="absolute inset-0 z-10"></div>}
              {/* <!-- Email Address --> */}
              <div>
                <Label>
                  Email Address<span className="text-error-500">*</span>
                </Label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || success}
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 dark:bg-gray-900 dark:placeholder:text-white/30 disabled:text-gray-500 disabled:border-gray-300 disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:dark:bg-gray-800 disabled:dark:text-gray-400 disabled:dark:border-gray-700"
                />
              </div>

              {/* <!-- New Password --> */}
              <div>
                <Label>
                  New Password<span className="text-error-500">*</span>
                </Label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || success}
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 dark:bg-gray-900 dark:placeholder:text-white/30 disabled:text-gray-500 disabled:border-gray-300 disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:dark:bg-gray-800 disabled:dark:text-gray-400 disabled:dark:border-gray-700"
                />
              </div>

              {/* <!-- Confirm Password --> */}
              <div>
                <Label>
                  Confirm Password<span className="text-error-500">*</span>
                </Label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || success}
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 dark:bg-gray-900 dark:placeholder:text-white/30 disabled:text-gray-500 disabled:border-gray-300 disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:dark:bg-gray-800 disabled:dark:text-gray-400 disabled:dark:border-gray-700"
                />
              </div>

              {/* <!-- Button --> */}
              <div>
                <button 
                  type="submit"
                  disabled={isLoading || success}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </div>
          </form>
          {!success && (
            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Return to login page
                <Link
                  href="/"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400 ml-1"
                >
                  Click here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
