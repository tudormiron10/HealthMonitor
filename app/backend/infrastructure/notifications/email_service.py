"""FastAPI-Mail adapter implementing the NotificationService port."""

import logging
from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType # type: ignore

from core.config import Settings
from domain.ports.notification_service import NotificationService

logger = logging.getLogger(__name__)

_TEMPLATES_DIR = Path(__file__).parent / "templates"


class EmailNotificationService(NotificationService):
    """Sends transactional emails via SMTP using fastapi-mail."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._mailer: FastMail | None = None

    def _get_mailer(self) -> FastMail | None:
        """Build FastMail on first use; returns None if credentials are not configured."""
        if self._mailer is not None:
            return self._mailer
        if not self._settings.mail_from:
            logger.warning("Email not configured (MAIL_FROM empty) — notifications disabled")
            return None
        conf = ConnectionConfig(
            MAIL_USERNAME=self._settings.mail_username,
            MAIL_PASSWORD=self._settings.mail_password,
            MAIL_FROM=self._settings.mail_from,
            MAIL_PORT=self._settings.mail_port,
            MAIL_SERVER=self._settings.mail_server,
            MAIL_STARTTLS=self._settings.mail_starttls,
            MAIL_SSL_TLS=self._settings.mail_ssl_tls,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
            TEMPLATE_FOLDER=_TEMPLATES_DIR,
        )
        self._mailer = FastMail(conf)
        return self._mailer

    async def send_verification_approved(self, email: str, first_name: str) -> None:
        """Send an email notifying the user that their verification was approved."""
        mailer = self._get_mailer()
        if mailer is None:
            return
        msg = MessageSchema(
            subject="Cont verificat — HealthMonitor",
            recipients=[email],
            template_body={
                "first_name": first_name,
                "frontend_base_url": self._settings.frontend_base_url,
            },
            subtype=MessageType.html,
        )
        await mailer.send_message(msg, template_name="verification_approved.html")
        logger.info("Verification approved email sent to %s", email)

    async def send_verification_rejected(self, email: str, first_name: str, reason: str) -> None:
        """Send an email notifying the user that their verification was rejected."""
        mailer = self._get_mailer()
        if mailer is None:
            return
        msg = MessageSchema(
            subject="Înregistrare respinsă — HealthMonitor",
            recipients=[email],
            template_body={
                "first_name": first_name,
                "reason": reason,
                "frontend_base_url": self._settings.frontend_base_url,
            },
            subtype=MessageType.html,
        )
        await mailer.send_message(msg, template_name="verification_rejected.html")
        logger.info("Verification rejected email sent to %s", email)

    async def send_password_reset(
        self, email: str, first_name: str, reset_link: str, lang: str
    ) -> None:
        """Send a password reset link; logs the link instead when mail is unconfigured."""
        mailer = self._get_mailer()
        if mailer is None:
            logger.info("Password reset link for %s: %s", email, reset_link)
            return
        if lang == "en":
            subject = "Password reset — HealthMonitor"
            template_name = "password_reset_en.html"
        else:
            subject = "Resetare parolă — HealthMonitor"
            template_name = "password_reset_ro.html"
        msg = MessageSchema(
            subject=subject,
            recipients=[email],
            template_body={"first_name": first_name, "reset_link": reset_link},
            subtype=MessageType.html,
        )
        await mailer.send_message(msg, template_name=template_name)
        logger.info("Password reset email sent to %s", email)
