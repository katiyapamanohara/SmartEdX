import { Metadata } from "next";
import React from "react";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Next.js Profile | SmartEdX - Next.js Dashboard Template",
  description:
    "This is Next.js Profile page for SmartEdX - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Profile() {
  return <ProfileClient />;
}
