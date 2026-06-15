"""SQLAlchemy adapter for the SpecialistRepository port."""

from uuid import UUID

from sqlalchemy import or_, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.specialist_repository import SpecialistRepository
from infrastructure.persistence.models.enums import VerificationStatus
from infrastructure.persistence.models.orm_models import SpecialistProfileORM, UserORM

_EXTENDED_WRITABLE_FIELDS = frozenset({
    "photo_url", "bio", "limbi_vorbite", "website_url", "program_lucru",
    "grad_profesional", "specializari_secundare", "competente_atestate",
    "specializare_nutritie", "specializare_sportiva", "filosofie_profesionala",
})


class SqlAlchemySpecialistRepository(SpecialistRepository):
    """Concrete implementation of SpecialistRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_full_dict(self, profile: SpecialistProfileORM, verification_status) -> dict:
        """Map an ORM row + user verification_status to the standard profile dict."""
        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "specialization": profile.specialization,
            "license_number": profile.license_number,
            "clinic_affiliation": profile.clinic_affiliation,
            "verification_status": verification_status,
            "rejection_reason": profile.rejection_reason,
            "cod_parafa": profile.cod_parafa,
            "unitate_sanitara": profile.unitate_sanitara,
            "numar_ondr": profile.numar_ondr,
            "institutie_absolvire": profile.institutie_absolvire,
            "tip_certificare": profile.tip_certificare,
            "numar_certificare": profile.numar_certificare,
            "verification_document_url": profile.verification_document_url,
            "verified_at": profile.verified_at,
            "verified_by_admin_id": profile.verified_by_admin_id,
            "photo_url": profile.photo_url,
            "bio": profile.bio,
            "limbi_vorbite": profile.limbi_vorbite,
            "website_url": profile.website_url,
            "program_lucru": profile.program_lucru,
            "grad_profesional": profile.grad_profesional,
            "specializari_secundare": profile.specializari_secundare,
            "competente_atestate": profile.competente_atestate,
            "specializare_nutritie": profile.specializare_nutritie,
            "specializare_sportiva": profile.specializare_sportiva,
            "filosofie_profesionala": profile.filosofie_profesionala,
            "updated_at": profile.updated_at,
        }

    async def add(self, specialist_data: dict) -> dict:
        """Persist a new specialist profile."""
        new_profile = SpecialistProfileORM(
            user_id=specialist_data["user_id"],
            first_name=specialist_data["first_name"],
            last_name=specialist_data["last_name"],
            specialization=specialist_data["specialization"],
            license_number=specialist_data.get("license_number"),
            clinic_affiliation=specialist_data.get("clinic_affiliation"),
            cod_parafa=specialist_data.get("cod_parafa"),
            unitate_sanitara=specialist_data.get("unitate_sanitara"),
            numar_ondr=specialist_data.get("numar_ondr"),
            institutie_absolvire=specialist_data.get("institutie_absolvire"),
            tip_certificare=specialist_data.get("tip_certificare"),
            numar_certificare=specialist_data.get("numar_certificare"),
        )
        self.session.add(new_profile)
        await self.session.flush()
        return {
            "id": new_profile.id,
            "user_id": new_profile.user_id,
            "first_name": new_profile.first_name,
            "last_name": new_profile.last_name,
            "specialization": new_profile.specialization,
            "license_number": new_profile.license_number,
            "clinic_affiliation": new_profile.clinic_affiliation,
        }

    async def get_by_id(self, specialist_id: UUID) -> dict | None:
        """Return a single specialist profile by primary key."""
        stmt = select(SpecialistProfileORM).where(SpecialistProfileORM.id == specialist_id)
        result = await self.session.execute(stmt)
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "specialization": profile.specialization,
            "license_number": profile.license_number,
            "clinic_affiliation": profile.clinic_affiliation,
            "cod_parafa": profile.cod_parafa,
            "unitate_sanitara": profile.unitate_sanitara,
            "numar_ondr": profile.numar_ondr,
            "institutie_absolvire": profile.institutie_absolvire,
            "tip_certificare": profile.tip_certificare,
            "numar_certificare": profile.numar_certificare,
            "verification_document_url": profile.verification_document_url,
            "verified_at": profile.verified_at,
            "verified_by_admin_id": profile.verified_by_admin_id,
        }

    async def get_by_user_id(self, user_id: UUID) -> dict | None:
        """Return a single specialist profile by user ID, including verification status."""
        stmt = (
            select(SpecialistProfileORM, UserORM.verification_status)
            .join(UserORM, UserORM.id == SpecialistProfileORM.user_id)
            .where(SpecialistProfileORM.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        row = result.one_or_none()

        if not row:
            return None

        profile, verification_status = row
        return self._to_full_dict(profile, verification_status)

    async def update(self, user_id: UUID, update_data: dict) -> dict | None:
        """Update a specialist profile by user ID and return the updated row."""
        if not update_data:
            return await self.get_by_user_id(user_id)

        stmt = (
            update(SpecialistProfileORM)
            .where(SpecialistProfileORM.user_id == user_id)
            .values(**update_data)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_user_id(user_id)

    async def search(
        self,
        name: str | None,
        specialization: str | None,
        offset: int,
        limit: int,
    ) -> list[dict]:
        """Return a list of specialist profiles matching the search criteria, with pagination."""
        stmt = select(SpecialistProfileORM)
        if name:
            pattern = f"%{name}%"
            stmt = stmt.where(
                or_(
                    SpecialistProfileORM.first_name.ilike(pattern),
                    SpecialistProfileORM.last_name.ilike(pattern),
                )
            )
        if specialization:
            stmt = stmt.where(SpecialistProfileORM.specialization == specialization)
        stmt = (
            stmt.order_by(SpecialistProfileORM.last_name, SpecialistProfileORM.first_name)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return [
            {
                "id": p.id,
                "user_id": p.user_id,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "specialization": p.specialization,
                "license_number": p.license_number,
                "clinic_affiliation": p.clinic_affiliation,
                "photo_url": p.photo_url,
                "unitate_sanitara": p.unitate_sanitara,
                "grad_profesional": p.grad_profesional,
            }
            for p in result.scalars().all()
        ]

    async def update_extended_profile(self, user_id: UUID, update_data: dict) -> dict | None:
        """Update the extended fields of a specialist profile by user ID and return the updated row."""
        safe = {k: v for k, v in update_data.items() if k in _EXTENDED_WRITABLE_FIELDS}
        if not safe:
            return await self.get_by_user_id(user_id)

        stmt = (
            update(SpecialistProfileORM)
            .where(SpecialistProfileORM.user_id == user_id)
            .values(**safe)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_user_id(user_id)

    async def set_photo_url(self, user_id: UUID, photo_url: str | None) -> None:
        """Set the photo_url of a specialist profile by user ID."""
        stmt = (
            update(SpecialistProfileORM)
            .where(SpecialistProfileORM.user_id == user_id)
            .values(photo_url=photo_url)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def request_reverification(self, user_id: UUID) -> dict | None:
        """Set the verification_status to PENDING_VERIFICATION and clear rejection_reason and verified_at."""
        await self.session.execute(
            update(UserORM)
            .where(UserORM.id == user_id)
            .values(verification_status=VerificationStatus.PENDING_VERIFICATION)
        )
        await self.session.execute(
            update(SpecialistProfileORM)
            .where(SpecialistProfileORM.user_id == user_id)
            .values(rejection_reason=None, verified_at=None)
        )
        await self.session.flush()
        return await self.get_by_user_id(user_id)

    async def get_public_profile(self, target_user_id: UUID) -> dict | None:
        """Return a specialist profile by user ID, only if the user is APPROVED."""
        stmt = (
            select(SpecialistProfileORM, UserORM.verification_status)
            .join(UserORM, UserORM.id == SpecialistProfileORM.user_id)
            .where(
                SpecialistProfileORM.user_id == target_user_id,
                UserORM.verification_status == VerificationStatus.APPROVED,
            )
        )
        result = await self.session.execute(stmt)
        row = result.one_or_none()

        if not row:
            return None

        profile, verification_status = row
        return self._to_full_dict(profile, verification_status)
