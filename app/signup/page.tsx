import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign up | Destiny Sermons",
  description: "Create your Destiny Sermons account with a magic link or Google sign-in.",
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AuthForm mode="signup" />
    </div>
  );
}
