import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articom Sign In",
  description: "Articom Sign In Page",
};

export default function SignIn() {
  return <SignInForm />;
}
