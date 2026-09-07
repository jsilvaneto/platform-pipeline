from pydantic import BaseModel, ConfigDict, Field

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    is_admin: bool = False

class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=6, max_length=100)
    is_admin: bool | None = None
    is_active: bool | None = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    username: str | None = None
