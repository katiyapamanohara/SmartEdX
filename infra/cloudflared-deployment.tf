resource "kubernetes_secret_v1" "cloudflared_credentials" {
  metadata {
    name      = "cloudflared-credentials"
    namespace = "argocd"
  }

  data = {
    TUNNEL_TOKEN = cloudflare_zero_trust_tunnel_cloudflared.main.tunnel_token
  }
}

resource "kubernetes_deployment_v1" "cloudflared" {
  metadata {
    name      = "cloudflared"
    namespace = "argocd"
    labels = {
      app = "cloudflared"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "cloudflared"
      }
    }

    template {
      metadata {
        labels = {
          app = "cloudflared"
        }
      }

      spec {
        container {
          name  = "cloudflared"
          image = "cloudflare/cloudflared:latest"
          args  = ["tunnel", "--no-autoupdate", "run", cloudflare_zero_trust_tunnel_cloudflared.main.name]

          env {
            name = "TUNNEL_TOKEN"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.cloudflared_credentials.metadata[0].name
                key  = "TUNNEL_TOKEN"
              }
            }
          }
        }
      }
    }
  }

  depends_on = [
    helm_release.argocd,
    cloudflare_zero_trust_tunnel_cloudflared.main,
    cloudflare_zero_trust_tunnel_cloudflared_config.main
  ]
}
