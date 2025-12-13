import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Login | Destiny Sermons",
  description: "Sign in to Destiny Sermons with a magic link or Google - no passwords required.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AuthForm mode="login" />
    </div>
  );
}
