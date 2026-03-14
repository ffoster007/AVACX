import { Suspense } from "react";
import AuthPageClient from "./AuthPageClient";

const AuthFallback = () => (
  <div className="min-h-screen bg-[#2C3544] flex items-center justify-center text-white p-8">
    <div className="w-full max-w-md text-center">Loading...</div>
  </div>
);

const AuthPage = () => (
  <Suspense fallback={<AuthFallback />}>
    <AuthPageClient />
  </Suspense>
);

export default AuthPage;
