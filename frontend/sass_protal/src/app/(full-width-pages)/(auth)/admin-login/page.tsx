import AdminSignInForm from "@/components/auth/AdminSignInForm";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Sign In | SmartEdX",
  description: "Sign in to the SmartEdX Admin Dashboard",
};

export default function AdminSignIn() {
  return <AdminSignInForm />;
}