

resource "cloudflare_record" "root_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "www_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}


resource "cloudflare_record" "api_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}


resource "cloudflare_record" "minio_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "minio"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "minio_console_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "minio-console"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "argocd_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "argocd"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "aicore_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "aicore"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "facial_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "facial"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "institute_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "institute"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "instituteservice_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "instituteservice"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}
resource "cloudflare_record" "qdrant" {
  zone_id = var.cloudflare_zone_id
  name    = "qdrant"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "sassservice_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "sassservice"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "voice_dns" {
  zone_id = var.cloudflare_zone_id
  name    = "voice"
  content = cloudflare_zero_trust_tunnel_cloudflared.main.cname
  type    = "CNAME"
  proxied = true
}


