provider "google" {
  credentials = file("../credentials/gcp.json")
  project     = var.project_id
  region      = var.region
}
