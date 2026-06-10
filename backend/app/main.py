import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import accounts, projects, messages, proposals, jobs, dashboard, conversations
from app.worker.scheduler import start_scheduler, stop_scheduler
from app.worker.pool import close_browser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    stop_scheduler()
    await close_browser()


app = FastAPI(title="Freelas Automation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["proposals"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
