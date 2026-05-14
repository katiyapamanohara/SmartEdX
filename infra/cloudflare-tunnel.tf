resource "kubernetes_namespace_v1" "cloudflared" {
  metadata {
    name = "cloudflared"
  }
}

resource "random_password" "tunnel_secret" {
  length  = 64
  special = false
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "main" {
  account_id = var.cloudflare_account_id
  name       = "eco-k8s-tunnel"
  secret     = base64encode(random_password.tunnel_secret.result)
}
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "main" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.main.id

  config {
    ingress_rule {
      hostname = var.domain
      service  = "http://saas-portal.prod.svc.cluster.local:3000"
    }
    ingress_rule {
      hostname = "www.${var.domain}"
      service  = "http://saas-portal.prod.svc.cluster.local:3000"
    }
    ingress_rule {
      hostname = "institute.${var.domain}"
      service  = "http://institute-portal.prod.svc.cluster.local:3000"
    }
    ingress_rule {
      hostname = "api.${var.domain}"
      service  = "http://api-gateway.prod.svc.cluster.local:5001"
    }
    ingress_rule {
      hostname = "aicore.${var.domain}"
      service  = "http://ai-core.prod.svc.cluster.local:8001"
    }
    ingress_rule {
      hostname = "facial.${var.domain}"
      service  = "http://facial-recognition.prod.svc.cluster.local:8002"
    }
    ingress_rule {
      hostname = "instituteservice.${var.domain}"
      service  = "http://institute-service.prod.svc.cluster.local:5003"
    }
    ingress_rule {
      hostname = "sassservice.${var.domain}"
      service  = "http://saas-service.prod.svc.cluster.local:5002"
    }
    ingress_rule {
      hostname = "sassservice.${var.domain}"
      service  = "http://saas-service.prod.svc.cluster.local:5002"
    }
    ingress_rule {
      hostname = "voice.${var.domain}"
      service  = "http://voice-agent.prod.svc.cluster.local:8000"
    }


    ingress_rule {
      hostname = "minio.${var.domain}"
      service  = "http://minio.prod.svc.cluster.local:9000"
    }

    ingress_rule {
      hostname = "minio-console.${var.domain}"
      service  = "http://minio-console.prod.svc.cluster.local:9001"
    }


    ingress_rule {
      hostname = "argocd.${var.domain}"
      service  = "http://argo-cd-argocd-server.argocd.svc.cluster.local:80"
    }

    ingress_rule {
      service = "http_status:404"
    }
  }
}