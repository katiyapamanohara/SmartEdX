import KnowledgeBaseDetail from "@/components/knowledge-base/KnowledgeBaseDetail";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Base Details | Articom SaaS",
  description: "View and manage knowledge base details",
};

export default function KnowledgeBaseDetailPage() {
  return (
    <div className="h-full flex flex-col">
      <PageBreadcrumb pageTitle="Knowledge Base Details" />
      <div className="flex-1">
        <KnowledgeBaseDetail />
      </div>
    </div>
  );
}
