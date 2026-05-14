
# # PROD Workload Identity binding
# resource "google_service_account_iam_member" "eco_api_prod_wi" {
#   service_account_id = "projects/${var.GCP_PROJECT_ID}/serviceAccounts/terraform-sa@${var.GCP_PROJECT_ID}.iam.gserviceaccount.com"
#   role               = "roles/iam.workloadIdentityUser"
#   member             = "serviceAccount:${var.GCP_PROJECT_ID}.svc.id.goog[prod/eco-api-ksa-prod]"
# }


