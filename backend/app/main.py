from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, submissions, receipts, ocr, admin, ai, threads, crew, api, track, channels, predicted_events, files, routing, gamification, transparency, whatsapp, anonymous, ai_alerts, integrations, emergency

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicPulse API",
    description="Autonomous Multilingual Smart Urban Helpdesk Kiosk API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(submissions.router)
app.include_router(channels.router)
app.include_router(predicted_events.router)
app.include_router(files.router)
app.include_router(routing.router)
app.include_router(receipts.router)
app.include_router(ocr.router)
app.include_router(admin.router)
app.include_router(admin.router, prefix="/api")  # /api/admin/* for spec compliance
app.include_router(ai.router)
app.include_router(threads.router)
app.include_router(crew.router)
app.include_router(api.router)
app.include_router(track.router)
app.include_router(gamification.router)
app.include_router(transparency.router)
app.include_router(whatsapp.router)
app.include_router(anonymous.router)
app.include_router(ai_alerts.router)
app.include_router(integrations.router)
app.include_router(emergency.router)

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "CivicPulse API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    import asyncio
    
    async def run_scheduler():
        while True:
            try:
                from app.sla_scheduler import check_sla_escalations
                await check_sla_escalations()
            except Exception as e:
                print(f"SLA scheduler skipped: {e}")
            await asyncio.sleep(300)  # Run every 5 minutes
            
    asyncio.create_task(run_scheduler())
