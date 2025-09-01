import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articom Sign Up",
  description: "Articom Sign Up Page",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
