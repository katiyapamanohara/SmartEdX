
# # PROD KSA
# resource "kubernetes_service_account_v1" "eco_api_prod_ksa" {
#   metadata {
#     name      = "eco-api-ksa-prod"
#     namespace = "prod"

#     annotations = {
#       "iam.gke.io/gcp-service-account" = "terraform-sa@${var.GCP_PROJECT_ID}.iam.gserviceaccount.com"
#     }
#   }
# }
