resource "kubernetes_secret_v1" "minio_credentials" {
  metadata {
    name      = "minio-credentials"
    namespace = "prod"
  }

  data = {
    MINIO_ROOT_USER     = var.minio_root_user
    MINIO_ROOT_PASSWORD = var.minio_root_password
  }

  type = "Opaque"

  depends_on = [kubernetes_namespace_v1.prod]
}

resource "kubernetes_persistent_volume_claim_v1" "minio_data" {
  metadata {
    name      = "minio-data"
    namespace = "prod"
  }

  spec {
    access_modes = ["ReadWriteOnce"]

    resources {
      requests = {
        storage = "20Gi"
      }
    }
  }

  wait_until_bound = false

  depends_on = [kubernetes_namespace_v1.prod]
}

resource "kubernetes_deployment_v1" "minio" {
  metadata {
    name      = "minio"
    namespace = "prod"
    labels = {
      app = "minio"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "minio"
      }
    }

    strategy {
      type = "Recreate"
    }

    template {
      metadata {
        labels = {
          app = "minio"
        }
      }

      spec {
        container {
          name  = "minio"
          image = "minio/minio:RELEASE.2025-04-22T22-12-26Z"

          args = ["server", "/data", "--console-address", ":9001"]

          port {
            name           = "api"
            container_port = 9000
          }

          port {
            name           = "console"
            container_port = 9001
          }

          env {
            name = "MINIO_ROOT_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.minio_credentials.metadata[0].name
                key  = "MINIO_ROOT_USER"
              }
            }
          }

          env {
            name = "MINIO_ROOT_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.minio_credentials.metadata[0].name
                key  = "MINIO_ROOT_PASSWORD"
              }
            }
          }

          volume_mount {
            name       = "data"
            mount_path = "/data"
          }

          liveness_probe {
            http_get {
              path = "/minio/health/live"
              port = 9000
            }
            initial_delay_seconds = 30
            period_seconds        = 30
          }

          readiness_probe {
            http_get {
              path = "/minio/health/ready"
              port = 9000
            }
            initial_delay_seconds = 10
            period_seconds        = 15
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "1"
              memory = "2Gi"
            }
          }
        }

        volume {
          name = "data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim_v1.minio_data.metadata[0].name
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "minio_api" {
  metadata {
    name      = "minio"
    namespace = "prod"
  }

  spec {
    selector = {
      app = "minio"
    }

    port {
      name        = "api"
      port        = 9000
      target_port = 9000
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_namespace_v1.prod]
}

resource "kubernetes_service_v1" "minio_console" {
  metadata {
    name      = "minio-console"
    namespace = "prod"
  }

  spec {
    selector = {
      app = "minio"
    }

    port {
      name        = "console"
      port        = 9001
      target_port = 9001
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_namespace_v1.prod]
}
