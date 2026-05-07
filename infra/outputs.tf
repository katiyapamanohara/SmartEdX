output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  value = google_container_cluster.primary.endpoint
}

output "argocd_admin_password" {
  description = "The initial admin password for ArgoCD"
  value       = data.kubernetes_secret_v1.argocd_admin_password.data["password"]
  sensitive   = true
}
