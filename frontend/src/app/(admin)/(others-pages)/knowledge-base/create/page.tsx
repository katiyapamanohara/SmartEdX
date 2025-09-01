import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateKnowledgeBase from "@/components/knowledge-base/CreateKnowledgeBase";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Knowledge Base | Articom SaaS",
  description: "Create a new knowledge base in Articom SaaS",
};

export default function CreateKnowledgeBasePage() {
  return (
    <div className="h-full flex flex-col">
      <PageBreadcrumb pageTitle="Create Knowledge Base" />
      <div className="flex-1">
        <CreateKnowledgeBase />
      </div>
    </div>
  );
}
