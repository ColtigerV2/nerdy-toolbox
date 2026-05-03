from functools import lru_cache
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    bricklink_consumer_key: str = os.getenv("BRICKLINK_CONSUMER_KEY", "")
    bricklink_consumer_secret: str = os.getenv("BRICKLINK_CONSUMER_SECRET", "")
    bricklink_token: str = os.getenv("BRICKLINK_TOKEN", "")
    bricklink_token_secret: str = os.getenv("BRICKLINK_TOKEN_SECRET", "")
    bricklink_currency: str = os.getenv("BRICKLINK_CURRENCY", "EUR")
    database_path: str = os.getenv("DATABASE_PATH", "data/lego_prices.sqlite")

    @property
    def is_bricklink_configured(self) -> bool:
        return all(
            [
                self.bricklink_consumer_key,
                self.bricklink_consumer_secret,
                self.bricklink_token,
                self.bricklink_token_secret,
            ]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
