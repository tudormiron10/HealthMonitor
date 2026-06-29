"""SQLAlchemy adapter for the UserRepository port."""

from uuid import UUID

from sqlalchemy import func, or_, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.user_repository import UserRepository
from infrastructure.persistence.models.orm_models import PatientProfileORM, SpecialistProfileORM, UserORM


class SqlAlchemyUserRepository(UserRepository):
    """Concrete implementation of UserRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> dict | None:
        """Return a single user by email."""
        stmt = select(UserORM).where(UserORM.email == email)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            return None

        return {
            "id": user.id,
            "email": user.email,
            "password_hash": user.password_hash,
            "role": user.role,
            "is_active": user.is_active,
            "verification_status": user.verification_status,
        }

    async def get_by_id(self, user_id: UUID) -> dict | None:
        """Return a single user by primary key."""
        stmt = select(UserORM).where(UserORM.id == user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            return None

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "verification_status": user.verification_status,
            "created_at": user.created_at,
        }

    async def add(self, user_data: dict) -> dict:
        """Persist a new user."""
        new_user = UserORM(
            email=user_data["email"],
            password_hash=user_data["password_hash"],
            role=user_data["role"],
            verification_status=user_data.get("verification_status"),
        )
        self.session.add(new_user)
        await self.session.flush()
        return {
            "id": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
        }

    async def list_all(
        self,
        role_filter: str | None,
        search_query: str | None,
        offset: int,
        limit: int,
        verification_status_filter: str | None = None,
    ) -> list[dict]:
        """Return a list of users matching the search criteria, with pagination."""
        first_name_col = func.coalesce(PatientProfileORM.first_name, SpecialistProfileORM.first_name)
        last_name_col = func.coalesce(PatientProfileORM.last_name, SpecialistProfileORM.last_name)

        stmt = (
            select(
                UserORM,
                first_name_col.label("first_name"),
                last_name_col.label("last_name"),
            )
            .outerjoin(PatientProfileORM, UserORM.id == PatientProfileORM.user_id)
            .outerjoin(SpecialistProfileORM, UserORM.id == SpecialistProfileORM.user_id)
        )

        if role_filter is not None:
            stmt = stmt.where(UserORM.role == role_filter)

        if verification_status_filter is not None:
            stmt = stmt.where(UserORM.verification_status == verification_status_filter)

        if search_query:
            pattern = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    UserORM.email.ilike(pattern),
                    first_name_col.ilike(pattern),
                    last_name_col.ilike(pattern),
                )
            )

        stmt = stmt.order_by(UserORM.created_at.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)

        return [
            {
                "id": row.UserORM.id,
                "email": row.UserORM.email,
                "role": row.UserORM.role,
                "is_active": row.UserORM.is_active,
                "verification_status": row.UserORM.verification_status,
                "created_at": row.UserORM.created_at,
                "first_name": row.first_name or "",
                "last_name": row.last_name or "",
            }
            for row in result.all()
        ]

    async def count_users(
        self,
        role_filter: str | None,
        verification_status_filter: str | None,
    ) -> int:
        """Return the count of users matching the search criteria."""
        stmt = select(func.count()).select_from(UserORM)
        if role_filter is not None:
            stmt = stmt.where(UserORM.role == role_filter)
        if verification_status_filter is not None:
            stmt = stmt.where(UserORM.verification_status == verification_status_filter)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def update_verification_status(self, user_id: UUID, status: str) -> None:
        """Update the verification_status of a user by primary key."""
        stmt = update(UserORM).where(UserORM.id == user_id).values(verification_status=status)
        await self.session.execute(stmt)
        await self.session.flush()

    async def update_password(self, user_id: UUID, new_hash: str) -> None:
        """Update the password_hash of a user by primary key."""
        stmt = update(UserORM).where(UserORM.id == user_id).values(password_hash=new_hash)
        await self.session.execute(stmt)
        await self.session.flush()

    async def set_active(self, user_id: UUID, is_active: bool) -> dict | None:
        """Set the is_active status of a user by primary key and return the updated row."""
        stmt = update(UserORM).where(UserORM.id == user_id).values(is_active=is_active)
        await self.session.execute(stmt)
        await self.session.flush()

        fetch = select(UserORM).where(UserORM.id == user_id)
        result = await self.session.execute(fetch)
        user = result.scalar_one_or_none()

        if not user:
            return None

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "verification_status": user.verification_status,
            "created_at": user.created_at,
        }
