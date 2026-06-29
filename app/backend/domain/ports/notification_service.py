"""Abstract port for outbound notification delivery."""

from abc import ABC, abstractmethod


class NotificationService(ABC):
    """Port defining notification operations."""

    @abstractmethod
    async def send_verification_approved(self, email: str, first_name: str) -> None:
        """Notify a specialist that their account has been approved."""

    @abstractmethod
    async def send_verification_rejected(self, email: str, first_name: str, reason: str) -> None:
        """Notify a specialist that their account has been rejected, including the reason."""

    @abstractmethod
    async def send_password_reset(
        self, email: str, first_name: str, reset_link: str, lang: str
    ) -> None:
        """Send a password reset link; lang selects the RO or EN template (fallback RO)."""
