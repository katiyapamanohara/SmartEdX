resource "kubernetes_stateful_set_v1" "qdrant_prod" {
  metadata {
    name      = "qdrant"
    namespace = "prod"
  }

  spec {
    service_name = "qdrant"
    replicas     = 1

    selector {
      match_labels = { app = "qdrant" }
    }

    template {
      metadata {
        labels = { app = "qdrant" }
      }

      spec {
        container {
          name  = "qdrant"
          image = "qdrant/qdrant:v1.16.1"

          port {
            container_port = 6333
            name           = "http"
          }

          resources {
            requests = {
              cpu    = "1"
              memory = "1Gi"
            }
            limits = {
              cpu    = "2"
              memory = "2Gi"
            }
          }

          volume_mount {
            name       = "qdrant-storage"
            mount_path = "/qdrant/storage"
          }

          readiness_probe {
            http_get {
              path = "/readyz"
              port = 6333
            }
            initial_delay_seconds = 10
            period_seconds        = 5
            failure_threshold     = 6
          }

          liveness_probe {
            http_get {
              path = "/livez"
              port = 6333
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            failure_threshold     = 3
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "qdrant-storage"
      }

      spec {
        access_modes = ["ReadWriteOnce"]

        resources {
          requests = {
            storage = "10Gi"
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "qdrant_prod_service" {
  metadata {
    name      = "qdrant"
    namespace = "prod"
  }

  spec {
    selector = { app = "qdrant" }

    port {
      port        = 6333
      target_port = 6333
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_stateful_set_v1.qdrant_prod]
}
