"""
Run once to seed the MetroArena menu with realistic stadium food items.

Usage:
    python -m scripts.seed_menu
"""

from __future__ import annotations

import asyncio
import json
import uuid
from decimal import Decimal

from sqlalchemy import delete, select, text

from app.db.models.menu_item import MenuCategory, MenuItem
from app.db.models.venue import Venue
from app.db.session import AsyncSessionLocal

MENU_ITEMS = [
    {
        "name": "Grilled Chicken Wrap",
        "description": "Tender grilled chicken, lettuce, tomato, and garlic sauce in a wheat tortilla.",
        "price": 249,
        "category": MenuCategory.HOT_FOOD,
        "prep_time_minutes": 7,
        "dietary_tags": ["halal"],
        "is_available": True,
    },
    {
        "name": "Paneer Tikka Roll",
        "description": "Spiced cottage cheese with onions and mint chutney wrapped in a fresh roti.",
        "price": 199,
        "category": MenuCategory.HOT_FOOD,
        "prep_time_minutes": 6,
        "dietary_tags": ["vegetarian"],
        "is_available": True,
    },
    {
        "name": "Stadium Burger",
        "description": "Juicy chicken patty with stadium-special sauce, pickles, and crispy lettuce.",
        "price": 299,
        "category": MenuCategory.HOT_FOOD,
        "prep_time_minutes": 8,
        "dietary_tags": ["halal"],
        "is_available": True,
    },
    {
        "name": "Veg Hot Dog",
        "description": "Plant-based sausage with mustard, ketchup, and grilled onions in a soft bun.",
        "price": 149,
        "category": MenuCategory.HOT_FOOD,
        "prep_time_minutes": 5,
        "dietary_tags": ["vegetarian", "vegan"],
        "is_available": True,
    },
    {
        "name": "Masala Chips",
        "description": "Crispy potato chips with spiced masala seasoning and chaat masala.",
        "price": 149,
        "category": MenuCategory.SNACKS,
        "prep_time_minutes": 3,
        "dietary_tags": ["vegetarian", "vegan"],
        "is_available": True,
    },
    {
        "name": "Samosa (2 pcs)",
        "description": "Crisp pastry filled with spiced potatoes and peas, served with green chutney.",
        "price": 80,
        "category": MenuCategory.SNACKS,
        "prep_time_minutes": 2,
        "dietary_tags": ["vegetarian"],
        "is_available": True,
    },
    {
        "name": "Nachos with Salsa",
        "description": "Corn tortilla chips with house-made tomato salsa and sour cream.",
        "price": 179,
        "category": MenuCategory.SNACKS,
        "prep_time_minutes": 3,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
    {
        "name": "Popcorn Combo",
        "description": "Large salted popcorn with a refillable soft drink.",
        "price": 129,
        "category": MenuCategory.SNACKS,
        "prep_time_minutes": 2,
        "dietary_tags": ["vegetarian", "vegan"],
        "is_available": True,
    },
    {
        "name": "Cold Cola",
        "description": "Chilled carbonated cola drink, 500ml.",
        "price": 99,
        "category": MenuCategory.BEVERAGES,
        "prep_time_minutes": 1,
        "dietary_tags": ["vegan"],
        "is_available": True,
    },
    {
        "name": "Lemon Nimbu Pani",
        "description": "Freshly squeezed lemon water with mint and a pinch of salt.",
        "price": 60,
        "category": MenuCategory.BEVERAGES,
        "prep_time_minutes": 2,
        "dietary_tags": ["vegetarian", "vegan"],
        "is_available": True,
    },
    {
        "name": "Mango Lassi",
        "description": "Chilled creamy mango yoghurt drink, a crowd favourite.",
        "price": 89,
        "category": MenuCategory.BEVERAGES,
        "prep_time_minutes": 2,
        "dietary_tags": ["vegetarian"],
        "is_available": True,
    },
    {
        "name": "Masala Chai",
        "description": "Spiced Indian milk tea, served hot in a paper cup.",
        "price": 49,
        "category": MenuCategory.BEVERAGES,
        "prep_time_minutes": 3,
        "dietary_tags": ["vegetarian"],
        "is_available": True,
    },
]


async def seed() -> None:
    """Replace the current demo venue menu with the seed set."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Venue).limit(1))
        venue = result.scalars().first()

        if venue is None:
            print("No venue found. Run the venue seed first.")
            return

        print(f"Seeding menu for venue: {venue.name} ({venue.id})")
        await session.execute(delete(MenuItem).where(MenuItem.venue_id == venue.id))

        for item_data in MENU_ITEMS:
            await session.execute(
                text(
                    """
                    INSERT INTO menu_items (
                        id,
                        venue_id,
                        name,
                        description,
                        price,
                        category,
                        dietary_tags,
                        image_url,
                        prep_time_minutes,
                        is_available,
                        is_sold_out
                    ) VALUES (
                        :id,
                        :venue_id,
                        :name,
                        :description,
                        :price,
                        CAST(:category AS menu_category_enum),
                        CAST(:dietary_tags AS jsonb),
                        :image_url,
                        :prep_time_minutes,
                        :is_available,
                        :is_sold_out
                    )
                    """
                ),
                {
                    "id": uuid.uuid4(),
                    "venue_id": venue.id,
                    "name": item_data["name"],
                    "description": item_data["description"],
                    "price": Decimal(str(item_data["price"])),
                    "category": item_data["category"].value,
                    "dietary_tags": json.dumps(item_data["dietary_tags"]),
                    "image_url": None,
                    "prep_time_minutes": item_data["prep_time_minutes"],
                    "is_available": item_data["is_available"],
                    "is_sold_out": False,
                },
            )

        await session.commit()
        print(f"Seeded {len(MENU_ITEMS)} menu items successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
