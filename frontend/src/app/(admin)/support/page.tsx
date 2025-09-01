import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import SupportTicketForm from "@/components/support/Support";

export const metadata: Metadata = {
  title: "AI Assistant | Articom SaaS Dashboard",
  description: "Intelligent AI assistant to help with questions and tasks",
  // other metadata
};

export default function AssistantPage() {
  return (
    <div className="h-full flex flex-col">
      <PageBreadcrumb pageTitle="Customer Support" />
      <div className="flex-1">
        <SupportTicketForm />
      </div>
    </div>
  );
}