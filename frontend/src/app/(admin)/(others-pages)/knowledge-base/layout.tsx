import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Knowledge Base | Articom SaaS",
  description: "Knowledge base and frequently asked questions for Articom SaaS",
};

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
