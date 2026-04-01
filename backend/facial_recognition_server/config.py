from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8002
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5001"
    # Face recognition backend: "Facenet512" | "ArcFace" | "VGG-Face" | "Facenet"
    FACE_MODEL: str = "Facenet512"
    # Detector backend: "retinaface" | "mtcnn" | "opencv" | "ssd"
    DETECTOR_BACKEND: str = "retinaface"
    # Cosine distance threshold for a match (lower = stricter)
    DISTANCE_THRESHOLD: float = 0.30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
