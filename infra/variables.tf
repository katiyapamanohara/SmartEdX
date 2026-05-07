variable "GCP_PROJECT_ID" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}


variable "cluster_name" {
  description = "GKE cluster name"
  type        = string

}

variable "postgres_user" {
  description = "PostgreSQL superuser username"
  type        = string
  sensitive   = true
  default     = "postgres"
}

variable "postgres_password" {
  description = "PostgreSQL superuser password"
  type        = string
  sensitive   = true
  default     = "postgres"
}

variable "postgres_db" {
  description = "Default PostgreSQL database name"
  type        = string
  default     = "smartedx_db"
}

variable "minio_root_user" {
  description = "MinIO root user (access key)"
  type        = string
  sensitive   = true
  default     = "minioadmin"
}

variable "minio_root_password" {
  description = "MinIO root password (secret key, min 8 chars)"
  type        = string
  sensitive   = true
  default     = "minioadmin"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the primary domain"
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Primary domain name"
  type        = string
  default     = "tehdehzzlw.space"
}


