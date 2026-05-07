
# 1. Wait Timer for GKE Node Pool
resource "time_sleep" "wait_180s" {
  depends_on      = [google_container_node_pool.primary_nodes]
  create_duration = "180s"
}

# 2. Argo CD Helm Deployment with Persistence
resource "helm_release" "argocd" {
  name             = "argo-cd"
  namespace        = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "7.6.12"
  create_namespace = true
  timeout          = 600
  cleanup_on_fail  = true



  values = [
    yamlencode({
      server = {
        service = {
          type = "ClusterIP"
        }
      }
      configs = {
        params = {
          "server.insecure" = "true"
        }
      }
      # --- PERSISTENCE SETTINGS ---
      # This ensures Redis (sessions/cache) survives restarts
      redis = {
        enabled = true
        master = {
          persistence = {
            enabled = true
            size    = "8Gi"
          }
        }
      }
      # This ensures Git clones are kept on disk
      repoServer = {
        persistence = {
          enabled = true
          size    = "10Gi"
        }
      }
      # This ensures the main controller state (if any) is backed up
      controller = {
        persistence = {
          enabled = true
          size    = "10Gi"
        }
      }
    })
  ]

  # Ensure the cluster and any pre-requisite sleep timers are finished
  depends_on = [time_sleep.wait_180s, google_container_cluster.primary]
}

data "kubernetes_secret_v1" "argocd_admin_password" {
  metadata {
    name      = "argocd-initial-admin-secret"
    namespace = helm_release.argocd.namespace
  }
  depends_on = [helm_release.argocd]
}

# 3. Create the Production Namespace
resource "kubernetes_namespace_v1" "prod" {
  metadata {
    name = "prod"
  }
  depends_on = [helm_release.argocd]
}


# 4. Final Wait Timer
resource "time_sleep" "wait_after_namespace_prod" {
  depends_on      = [kubernetes_namespace_v1.prod]
  create_duration = "30s"
}

