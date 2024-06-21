resource "google_project_service" "firestore" {
  service = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_run" {
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secret_manager" {
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_firestore_database" "voice-assistant" {
  depends_on = [google_project_service.firestore]
  name = "${"voice-assistant"}-${var.region}"
  provider = google
  type     = "FIRESTORE_NATIVE"
  location_id = var.region
}

resource "google_secret_manager_secret" "openai_secret" {
  depends_on = [google_project_service.secret_manager]

  secret_id = "openai_secret"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "openai_secret" {
  depends_on = [google_secret_manager_secret.openai_secret]
  secret = google_secret_manager_secret.openai_secret.name
  secret_data = file("../credentials/openai.txt")
}