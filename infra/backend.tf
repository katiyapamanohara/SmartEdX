terraform {
  backend "gcs" {
    bucket = "smartedx-terraform-states"
    prefix = "infra/main"
  }
}
