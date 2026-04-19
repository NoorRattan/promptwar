from typing import cast

from firebase_admin import storage
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)


def upload_menu_item_image(
    file_bytes: bytes, venue_id: str, original_filename: str, content_type: str
) -> str:
    """
    Upload a menu item image to Firebase Storage.

    Stores at: venues/{venue_id}/menu/{uuid}-{original_filename}
    Makes blob public and returns the public URL for storage in MenuItem.image_url.

    Args:
        file_bytes: Raw file bytes from the uploaded file
        venue_id: Parent venue UUID for folder organisation
        original_filename: Original filename (sanitised before use)
        content_type: MIME type (e.g., "image/jpeg", "image/webp")

    Returns:
        str: Public URL of the uploaded image (Firebase Storage CDN URL)

    Raises:
        ValueError: If content_type is not an image type
        Exception: If Firebase Storage upload fails
    """
    if not content_type.startswith("image/"):
        raise ValueError(f"Invalid content_type for image upload: {content_type}")

    # Sanitise filename — remove path separators and special characters
    safe_filename = "".join(c for c in original_filename if c.isalnum() or c in "._-")[
        :100
    ]

    path = f"venues/{venue_id}/menu/{uuid4()}-{safe_filename}"
    bucket = storage.bucket()
    blob = bucket.blob(path)

    try:
        blob.upload_from_string(file_bytes, content_type=content_type)
        blob.make_public()
        logger.info("Menu image uploaded: path=%s", path)
        return cast(str, blob.public_url)
    except Exception as e:
        logger.error("Menu image upload failed venue=%s: %s", venue_id, str(e))
        raise


def upload_floor_plan(
    file_bytes: bytes, venue_id: str, content_type: str = "image/png"
) -> str:
    """
    Upload a venue floor plan image used as a Google Maps GroundOverlay.
    Replaces any existing floor plan for the venue.
    Stores at: venues/{venue_id}/floor_plan/floor_plan.{ext}
    Returns the public URL stored in Venue.floor_plan_url.
    """
    ext = content_type.split("/")[-1] if "/" in content_type else "png"
    path = f"venues/{venue_id}/floor_plan/floor_plan.{ext}"
    bucket = storage.bucket()
    blob = bucket.blob(path)

    try:
        blob.upload_from_string(file_bytes, content_type=content_type)
        blob.make_public()
        logger.info("Floor plan uploaded: venue=%s", venue_id)
        return cast(str, blob.public_url)
    except Exception as e:
        logger.error("Floor plan upload failed venue=%s: %s", venue_id, str(e))
        raise


def upload_incident_media(
    file_bytes: bytes, incident_id: str, original_filename: str, content_type: str
) -> str:
    """
    Upload media file (image or video) attached to an incident report.
    Stores at: incidents/{incident_id}/{uuid}-{filename}
    Returns public URL.
    """
    safe_filename = "".join(c for c in original_filename if c.isalnum() or c in "._-")[
        :100
    ]
    path = f"incidents/{incident_id}/{uuid4()}-{safe_filename}"
    bucket = storage.bucket()
    blob = bucket.blob(path)

    try:
        blob.upload_from_string(file_bytes, content_type=content_type)
        blob.make_public()
        logger.info("Incident media uploaded: incident=%s", incident_id)
        return cast(str, blob.public_url)
    except Exception as e:
        logger.error(
            "Incident media upload failed incident=%s: %s", incident_id, str(e)
        )
        raise


def delete_file(storage_path: str) -> None:
    """
    Delete a file from Firebase Storage by its storage path.
    Used when a menu item is deleted or a floor plan is replaced.
    Logs warning on failure but does not raise (deletion is non-critical).
    """
    try:
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        blob.delete()
        logger.info("Storage file deleted: path=%s", storage_path)
    except Exception as e:
        logger.warning("Storage file deletion failed path=%s: %s", storage_path, str(e))
