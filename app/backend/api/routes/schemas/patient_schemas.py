"""Patient Profile schemas."""

import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class PatientProfileUpdate(BaseModel):
    """Partial update payload for a patient's own profile."""

    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: datetime.date | None = None
    sex: int | None = Field(None, description="1=Male, 2=Female")

class PatientProfileRead(BaseModel):
    """Response payload representing a patient's profile."""

    id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    date_of_birth: datetime.date
    sex: int
    
    class Config:
        from_attributes = True
