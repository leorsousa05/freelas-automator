from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Account
from app.schemas import AccountCreate, AccountUpdate, AccountOut
from app.encryption import encrypt, decrypt

router = APIRouter()


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()


@router.post("", response_model=AccountOut)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    existing = db.query(Account).filter(Account.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    account = Account(
        username=data.username,
        password_encrypted=encrypt(data.password),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{id}", response_model=AccountOut)
def get_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/{id}", response_model=AccountOut)
def update_account(id: UUID, data: AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if data.username is not None:
        account.username = data.username
    if data.password is not None:
        account.password_encrypted = encrypt(data.password)
    if data.is_active is not None:
        account.is_active = data.is_active
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{id}")
def delete_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"ok": True}


@router.post("/{id}/sync")
def sync_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    # TODO: trigger sync via scheduler in Task 12
    return {"status": "queued", "account_id": str(id)}
