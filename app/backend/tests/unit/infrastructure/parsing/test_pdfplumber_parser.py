"""Unit tests for PdfPlumberParser.parse_markers — regex extraction from lab text."""

import pytest

from infrastructure.parsing.pdfplumber_parser import PdfPlumberParser


@pytest.fixture
def parser():
    return PdfPlumberParser()


class TestParseMarkers:
    def test_given_glucose_line_when_parse_then_extracts_value(self, parser):
        # Act
        markers = parser.parse_markers("Glucoza serica 95 mg/dL")

        # Assert
        assert markers.fasting_glucose == 95.0

    def test_given_hba1c_line_when_parse_then_extracts_decimal(self, parser):
        # Act
        markers = parser.parse_markers("Hemoglobina glicozilata HbA1c 5.7 %")

        # Assert
        assert markers.hba1c == 5.7

    def test_given_multiple_markers_when_parse_then_extracts_all(self, parser):
        # Arrange
        text = (
            "Glucoza serica 95 mg/dL\n"
            "Colesterol seric total 180 mg/dL\n"
            "Creatinina serica 0.9 mg/dL\n"
            "Hemoglobina (HGB) 14.5 g/dL\n"
        )

        # Act
        markers = parser.parse_markers(text)

        # Assert
        assert markers.fasting_glucose == 95.0
        assert markers.total_cholesterol == 180.0
        assert markers.creatinine == 0.9
        assert markers.hemoglobin == 14.5

    def test_given_unrelated_text_when_parse_then_returns_empty(self, parser):
        # Act
        markers = parser.parse_markers("Acest document nu contine valori de laborator.")

        # Assert
        assert markers.fasting_glucose is None
        assert markers.hemoglobin is None

    def test_given_only_one_marker_when_parse_then_others_are_none(self, parser):
        # Act
        markers = parser.parse_markers("Glucoza serica 95 mg/dL")

        # Assert
        assert markers.hba1c is None
        assert markers.creatinine is None

    def test_given_value_when_parse_then_is_float(self, parser):
        # Act
        markers = parser.parse_markers("Glucoza serica 95 mg/dL")

        # Assert
        assert isinstance(markers.fasting_glucose, float)


class TestProcessPdf:
    def test_given_nonexistent_file_when_process_then_returns_empty_markers(self, parser):
        # Act — extract_text swallows the error and returns "", so parsing yields empties
        markers = parser.process_pdf("does_not_exist.pdf")

        # Assert
        assert markers.fasting_glucose is None
        assert markers.hemoglobin is None
