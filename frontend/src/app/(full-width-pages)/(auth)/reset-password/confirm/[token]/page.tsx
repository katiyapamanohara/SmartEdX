"use client";

import React from "react";
import ConfirmResetPasswordForm from "@/components/auth/ConfirmResetPasswordForm";
import { useParams } from "next/navigation";

export default function ConfirmResetPasswordPage() {
  const params = useParams();
  const token = params.token as string;

  return <ConfirmResetPasswordForm token={token} />;
}
