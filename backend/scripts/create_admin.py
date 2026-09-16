"""Bootstrap the first admin user via the Supabase service-role key.

Usage (from the backend directory):
    python scripts/create_admin.py

Prompts for email and password, creates the user with app_metadata.role = "admin",
and inserts a profile row with role = 'admin'.
"""

import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.supabase_client import get_supabase_admin


def main():
    email = input("Admin email: ").strip()
    password = input("Admin password: ").strip()
    full_name = input("Full name: ").strip() or "Admin"

    if not email or not password:
        print("Email and password are required.")
        return

    client = get_supabase_admin()

    try:
        client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name, "role": "admin"},
                "app_metadata": {"role": "admin"},
            }
        )
        print(f"Admin user created: {email}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
