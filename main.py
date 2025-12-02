cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="PropelMe - AI Networking Agent",
    version="2.0",
    description="Complete AI-powered networking platform with LinkedIn, Eventbrite, and smart prioritization"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "PropelMe",
        "status": "running",
        "version": "2.0",
        "features": {
            "ai_messaging": "Generate personalized networking messages",
            "linkedin_oauth": "Connect LinkedIn account",
            "contact_prioritization": "Smart contact scoring and scheduling",
            "event_discovery": "Find networking events via Eventbrite",
            "network_analysis": "AI-powered network health insights"
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "ai": "/ai/*",
            "auth": "/auth/*",
            "contacts": "/contacts/*",
            "events": "/events/*"
        }
    }

@app.get("/health")
def health():
    from App.Config import settings
    return {
        "status": "healthy",
        "project_id": os.getenv("GOOGLE_PROJECT_ID", "not-set"),
        "integrations": {
            "linkedin": settings.has_linkedin(),
            "eventbrite": settings.has_eventbrite(),
            "vertex_ai": bool(settings.google_project_id)
        }
    }

# Load all routers
routers = []

try:
    from App.Routers.AI import router as ai_router
    app.include_router(ai_router)
    routers.append("AI")
except Exception as e:
    print(f"✗ AI router failed: {e}")

try:
    from App.Routers.Auth import router as auth_router
    app.include_router(auth_router)
    routers.append("Auth")
except Exception as e:
    print(f"✗ Auth router failed: {e}")

try:
    from App.Routers.Contacts import router as contacts_router
    app.include_router(contacts_router)
    routers.append("Contacts")
except Exception as e:
    print(f"✗ Contacts router failed: {e}")

try:
    from App.Routers.Events import router as events_router
    app.include_router(events_router)
    routers.append("Events")
except Exception as e:
    print(f"✗ Events router failed: {e}")

print(f"✓ Loaded routers: {', '.join(routers)}")
EOF
