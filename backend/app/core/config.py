from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    site_url: str = "http://localhost:3000"  # frontend base URL for Stripe success/cancel redirects

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_db_url: str = ""  # session-pooler URL incl. DB password; activates the RLS bridge

    ai_assessment_provider: str = ""
    ai_assessment_api_key: str = ""
    ai_assessment_base_url: str = "https://api.openai.com/v1/chat/completions"

    resend_api_key: str = ""
    email_from: str = "onboarding@resend.dev"   # free tier sender; swap to your own domain once verified

    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
