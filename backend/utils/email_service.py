"""
Email service — centralized wrapper around Resend.

All emails sent through the platform go through send_email().
Failures are logged but never raised — email delivery should never
block a user-facing operation (approval, signup, etc.).

Configuration via environment variables:
  RESEND_API_KEY       — required, from Resend dashboard
  EMAIL_FROM_ADDRESS   — defaults to "noreply@firstchapter.ai"
  EMAIL_FROM_NAME      — defaults to "Firstchapter"
"""

import os
import requests
from typing import Optional


RESEND_API_URL = "https://api.resend.com/emails"

DEFAULT_FROM_ADDRESS = "noreply@firstchapter.ai"
DEFAULT_FROM_NAME = "Firstchapter"


def _get_from_header() -> str:
    """Build the From header in 'Display Name <email@domain>' format."""
    name = os.getenv("EMAIL_FROM_NAME", DEFAULT_FROM_NAME)
    address = os.getenv("EMAIL_FROM_ADDRESS", DEFAULT_FROM_ADDRESS)
    return f"{name} <{address}>"


def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    reply_to: Optional[str] = None,
    tags: Optional[dict] = None,
) -> dict:
    """
    Send an email via Resend.

    Args:
        to: Recipient email address (single recipient, string)
        subject: Email subject line
        html: HTML body content
        text: Optional plain-text fallback (auto-stripped from html if None)
        reply_to: Optional reply-to address (different from sender)
        tags: Optional dict for Resend analytics tagging
            (e.g. {"category": "welcome", "user_type": "reader"})

    Returns:
        {
          "success": bool,
          "id": str | None,           # Resend message ID if successful
          "error": str | None,        # Error message if failed
        }

    Notes:
        - Never raises. Failures are logged and returned as {success: False}.
        - Caller decides whether email failure is fatal (it usually shouldn't be).
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        msg = "RESEND_API_KEY not configured — email skipped"
        print(f"⚠️ {msg}")
        return {"success": False, "id": None, "error": msg}

    if not to or "@" not in to:
        msg = f"Invalid recipient: {to}"
        print(f"⚠️ Email skipped — {msg}")
        return {"success": False, "id": None, "error": msg}

    payload = {
        "from": _get_from_header(),
        "to": [to],
        "subject": subject,
        "html": html,
    }

    if text:
        payload["text"] = text

    if reply_to:
        payload["reply_to"] = reply_to

    if tags:
        # Resend wants tags as a list of {name, value} objects
        payload["tags"] = [{"name": k, "value": str(v)} for k, v in tags.items()]

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10,
        )

        if response.status_code in (200, 201):
            data = response.json()
            email_id = data.get("id")
            print(f"✅ Email sent to {to} (id: {email_id}, subject: '{subject[:50]}')")
            return {"success": True, "id": email_id, "error": None}

        # Non-2xx — surface the error from Resend
        error_text = response.text[:500]
        print(f"⚠️ Email send failed ({response.status_code}) to {to}: {error_text}")
        return {
            "success": False,
            "id": None,
            "error": f"Resend returned {response.status_code}: {error_text}",
        }

    except requests.exceptions.Timeout:
        msg = "Resend API timeout"
        print(f"⚠️ Email send to {to} — {msg}")
        return {"success": False, "id": None, "error": msg}

    except requests.exceptions.RequestException as e:
        msg = f"Network error: {e}"
        print(f"⚠️ Email send to {to} — {msg}")
        return {"success": False, "id": None, "error": msg}

    except Exception as e:
        msg = f"Unexpected error: {e}"
        print(f"⚠️ Email send to {to} — {msg}")
        return {"success": False, "id": None, "error": msg}
