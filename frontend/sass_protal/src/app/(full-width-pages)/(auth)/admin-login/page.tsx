import AdminSignInForm from "@/components/auth/AdminSignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js Admin SignIn Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Admin Signin Page",
};

export default function AdminSignIn() {
  return <AdminSignInForm />;
}