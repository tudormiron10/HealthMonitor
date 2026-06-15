"""Unit tests for SpecialistService.compute_headline — pure display-string logic."""

from application.specialist_service import SpecialistService
from infrastructure.persistence.models.enums import MedicalSpecialization


class TestComputeHeadline:
    def test_given_specialization_only_when_compute_then_returns_specialization_label(self):
        # Arrange
        profile = {"specialization": MedicalSpecialization.CARDIOLOGIE}

        # Act
        headline = SpecialistService.compute_headline(profile, None)

        # Assert
        assert headline == "Cardiologie"

    def test_given_specialization_and_latest_workplace_when_compute_then_joins_with_separator(self):
        # Arrange
        profile = {"specialization": MedicalSpecialization.CARDIOLOGIE}

        # Act
        headline = SpecialistService.compute_headline(profile, "Spitalul Judetean")

        # Assert
        assert headline == "Cardiologie · Spitalul Judetean"

    def test_given_unitate_sanitara_when_compute_then_takes_precedence_over_latest(self):
        # Arrange — the profile's own workplace wins over the passed latest_workplace
        profile = {
            "specialization": MedicalSpecialization.CARDIOLOGIE,
            "unitate_sanitara": "Clinica Privata A",
        }

        # Act
        headline = SpecialistService.compute_headline(profile, "Spitalul B")

        # Assert
        assert headline == "Cardiologie · Clinica Privata A"

    def test_given_empty_profile_and_no_workplace_when_compute_then_returns_empty_string(self):
        # Act
        headline = SpecialistService.compute_headline({}, None)

        # Assert
        assert headline == ""
