"""
Authentication and security module.
Supports Firebase ID token verification (Phone OTP / Google / Email) and
secure password hashing (bcrypt) + JWT bearer sessions when running standalone.
Never stores plaintext passwords or fixed OTPs.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
except ImportError:  # pragma: no cover
    firebase_admin = None
    firebase_auth = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_minutes: int = 60 * 24) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET_KEY environment variable must be configured for local JWT tokens.")
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def init_firebase_admin() -> None:
    if firebase_admin is not None and not firebase_admin._apps:
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        if project_id:
            firebase_admin.initialize_app(options={"projectId": project_id})


def verify_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
        )

    token = credentials.credentials

    # 1. Try Firebase ID Token verification when configured
    if firebase_auth is not None and firebase_admin._apps:
        try:
            decoded = firebase_auth.verify_id_token(token)
            return {
                "uid": decoded["uid"],
                "email": decoded.get("email"),
                "phone_number": decoded.get("phone_number"),
                "provider": "firebase",
            }
        except Exception:
            pass

    # 2. Fallback to local HS256 JWT verification if JWT_SECRET_KEY is configured
    if JWT_SECRET:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            sub = payload.get("sub")
            if sub:
                return {"uid": sub, "provider": "jwt"}
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
            ) from exc

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not verify authentication credentials.",
    )
