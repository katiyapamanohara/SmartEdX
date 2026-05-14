

# --------------------------------------------------
# Enable Required GCP APIs
# --------------------------------------------------
resource "google_project_service" "services" {
  for_each = toset([
    "container.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
  ])



  project = var.GCP_PROJECT_ID
  service = each.key

  disable_on_destroy = false
}

# --------------------------------------------------
# Artifact Registry (Docker)
# --------------------------------------------------
resource "google_artifact_registry_repository" "docker_repo" {
  project       = var.GCP_PROJECT_ID
  location      = var.region
  repository_id = "smartedx-docker-repo"
  description   = "Docker images for GKE workloads"
  format        = "DOCKER"

  depends_on = [
    google_project_service.services
  ]
}


# --------------------------------------------------
# GKE Node Service Account
# --------------------------------------------------
resource "google_service_account" "gke_node_sa" {
  project      = var.GCP_PROJECT_ID
  account_id   = "gke-node-sa"
  display_name = "GKE Node Service Account"

  depends_on = [google_project_service.services]
}

resource "google_project_iam_member" "gke_node_sa_gar_reader" {
  project = var.GCP_PROJECT_ID
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_node_sa.email}"
}


# --------------------------------------------------
# GKE Cluster (Standard)
# --------------------------------------------------
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.zone
  project  = var.GCP_PROJECT_ID

  remove_default_node_pool = true
  initial_node_count       = 1

  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {}

  release_channel {
    channel = "REGULAR"
  }

  deletion_protection = false

  workload_identity_config {
    workload_pool = "${var.GCP_PROJECT_ID}.svc.id.goog"
  }

  depends_on = [
    google_project_service.services
  ]
}

# --------------------------------------------------
# GKE Node Pool
# --------------------------------------------------
resource "google_container_node_pool" "primary_nodes" {
  name     = "primary-node-pool"
  location = var.zone
  cluster  = google_container_cluster.primary.name
  project  = var.GCP_PROJECT_ID

  autoscaling {
    min_node_count = 1
    max_node_count = 2
  }

  node_config {
    machine_type    = "e2-standard-2"
    disk_size_gb    = 50
    disk_type       = "pd-standard"
    service_account = google_service_account.gke_node_sa.email

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  depends_on = [google_container_cluster.primary]
}
