"""Custom application exceptions.

Each exception maps to a specific HTTP status code. The global error
handler in api/middleware.py catches these and returns a uniform
JSON error response.
"""


class AppException(Exception):
    """Base exception for all application-level errors."""

    def __init__(self, message: str = "An application error occurred", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found (404)."""

    def __init__(self, resource: str = "Resource", identifier: str = ""):
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} '{identifier}' not found"
        super().__init__(message=detail, status_code=404)


class ForbiddenException(AppException):
    """Access denied due to insufficient permissions (403)."""

    def __init__(self, message: str = "You do not have permission to access this resource"):
        super().__init__(message=message, status_code=403)


class ValidationException(AppException):
    """Invalid input data (422)."""

    def __init__(self, message: str = "Validation error"):
        super().__init__(message=message, status_code=422)


class UnauthorizedException(AppException):
    """Authentication required or credentials invalid (401)."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, status_code=401)


class ConflictException(AppException):
    """Conflict with existing data (409)."""

    def __init__(self, message: str = "Conflict with existing resource"):
        super().__init__(message=message, status_code=409)


class DecryptionFailedError(Exception):
    """ABE decryption failed — the user key did not satisfy the policy."""
