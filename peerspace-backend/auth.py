import os
import secrets
import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt, JWTError
import bcrypt as bcrypt_lib

from database import get_db
from models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# Signing key comes from the environment. If it is missing we generate a random
# one per process instead of falling back to a constant: tokens then stop
# working on restart, which is noisy in dev but cannot be forged by anyone who
# has read the source.
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(32)
    print("WARNING: SECRET_KEY is not set. Using a random key for this process; "
          "existing tokens will be rejected after every restart.")

ALGORITHM = "HS256"
TOKEN_TTL = datetime.timedelta(days=1)

bearer_scheme = HTTPBearer()


# SCHEMAS
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "profile_picture": user.profile_picture,
    }


# PASSWORD FUNCTIONS
def hash_password(password: str):
    return bcrypt_lib.hashpw(password.encode('utf-8'), bcrypt_lib.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str):
    try:
        return bcrypt_lib.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        # Row was not created by hash_password (e.g. the seeded guest account).
        return False


# TOKEN FUNCTIONS
def create_token(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + TOKEN_TTL
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the caller from their bearer token.

    Every write endpoint depends on this rather than trusting a user_id sent
    by the client, which would let anyone act as anyone.
    """
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Malformed token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return user


# SIGNUP
@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User created",
        "token": create_token(user.id),
        "user": user_dict(user),
    }


# LOGIN
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    return {
        "message": "Login successful",
        "token": create_token(user.id),
        "user": user_dict(user),
    }


# GUEST
GUEST_ID = 99999
GUEST_EMAIL = "guest99999@peerspace.ai"


@router.post("/guest")
def guest_login(db: Session = Depends(get_db)):
    """Issue a token for the shared read-mostly guest account.

    The UI has always offered "continue as guest"; previously it made up a
    client-side id and sent no credentials at all. Handing guests a real token
    means every endpoint can require one.
    """
    user = db.query(User).filter(User.id == GUEST_ID).first()

    if not user:
        user = User(
            id=GUEST_ID,
            username="Guest",
            email=GUEST_EMAIL,
            password_hash="!",  # unusable: no password can hash to this
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "message": "Guest session started",
        "token": create_token(user.id),
        "user": user_dict(user),
    }


# CURRENT USER
@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    """Let the client recover its identity from the token alone."""
    return user_dict(current_user)
