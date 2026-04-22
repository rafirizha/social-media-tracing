from __future__ import annotations

from .facebook import FacebookMarketplaceRunner
from .instagram import InstagramRunner
from .tiktok import TikTokRunner


RUNNERS = {
    "tiktok": TikTokRunner(),
    "instagram": InstagramRunner(),
    "facebook_marketplace": FacebookMarketplaceRunner(),
}
