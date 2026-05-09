"""
Email templates — shared HTML layout + per-trigger email builders.

Every email through the platform should use one of the build_*_email()
functions below. They each return a dict with keys:
  { "subject": str, "html": str, "text": str, "tags": dict }

Pass that to send_email() as kwargs.

Layout principles:
  - Text-only header with brand styling ("First" + "chapter" in green)
  - Single-column, max-width 600px (renders consistently across clients)
  - Inline CSS only (Outlook & Gmail web strip <style> tags inconsistently)
  - Plain-text fallback for every email
  - System fonts (no web font dependencies — too unreliable in email)
"""

from typing import Optional


# ──────────────────────────────────────────────────────────────────
# Brand constants — match the website
# ──────────────────────────────────────────────────────────────────
BRAND_DARK = "#2C2C2A"
BRAND_GREEN = "#1D9E75"
BRAND_BLUE = "#378ADD"
TEXT_BODY = "#3D3D3A"
TEXT_MUTED = "#888780"
BG_PAGE = "#f9f9f7"
BG_CARD = "#ffffff"
BORDER_LIGHT = "#e5e4dc"

# Public URLs the user lands on from email links
APP_BASE_URL = "https://www.firstchapter.ai"
SUPPORT_EMAIL = "support@firstchapter.ai"

# System font stack (renders well across Gmail/Outlook/Apple Mail)
FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"


# ──────────────────────────────────────────────────────────────────
# Shared layout wrapper
# ──────────────────────────────────────────────────────────────────
def _wrap_layout(content_html: str, preheader: str = "") -> str:
    """
    Wrap email content in the shared header/footer layout.

    Args:
        content_html: The body content HTML (between header and footer)
        preheader: Optional preview text shown in inbox previews
                   (kept short — most clients show first 100 chars)
    """
    preheader_html = ""
    if preheader:
        preheader_html = f"""
<div style="display:none; font-size:1px; color:{BG_PAGE}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
  {preheader}
</div>
"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Firstchapter</title>
</head>
<body style="margin:0; padding:0; background:{BG_PAGE}; font-family:{FONT_STACK}; color:{TEXT_BODY};">
{preheader_html}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:{BG_PAGE};">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <!-- Outer container, max 600px -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; background:{BG_CARD}; border:1px solid {BORDER_LIGHT}; border-radius:12px; overflow:hidden;">

        <!-- Header (text-only branding) -->
        <tr>
          <td style="padding:28px 32px 20px 32px; border-bottom:1px solid {BORDER_LIGHT};">
            <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; font-weight:bold; letter-spacing:-0.3px;">
              <span style="color:{BRAND_DARK};">First</span><span style="color:{BRAND_GREEN};">chapter</span>
            </div>
          </td>
        </tr>

        <!-- Content body -->
        <tr>
          <td style="padding:32px;">
            {content_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px; background:{BG_PAGE}; border-top:1px solid {BORDER_LIGHT};">
            <p style="margin:0 0 6px 0; font-size:12px; color:{TEXT_MUTED}; line-height:1.5;">
              You received this email because you have an account with Firstchapter.
            </p>
            <p style="margin:0; font-size:12px; color:{TEXT_MUTED}; line-height:1.5;">
              Questions? Reach us at <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN}; text-decoration:none;">{SUPPORT_EMAIL}</a>
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>"""


def _btn(label: str, url: str, color: str = BRAND_GREEN) -> str:
    """Generate an inline-styled button. Email-client friendly."""
    return f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:{color}; border-radius:8px;">
      <a href="{url}" style="display:inline-block; padding:12px 28px; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; font-family:{FONT_STACK};">
        {label}
      </a>
    </td>
  </tr>
</table>
"""


def _para(text: str, muted: bool = False) -> str:
    color = TEXT_MUTED if muted else TEXT_BODY
    return f'<p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:{color};">{text}</p>'


def _heading(text: str) -> str:
    return f'<h1 style="margin:0 0 20px 0; font-size:22px; font-weight:600; color:{BRAND_DARK}; line-height:1.3;">{text}</h1>'


def _info_box(content_html: str, accent: str = BRAND_GREEN) -> str:
    """A muted info box — used for FUP details, validity period, etc."""
    return f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0; background:{BG_PAGE}; border-left:3px solid {accent}; border-radius:6px;">
  <tr>
    <td style="padding:16px 18px; font-size:14px; line-height:1.6; color:{TEXT_BODY};">
      {content_html}
    </td>
  </tr>
</table>
"""


# ══════════════════════════════════════════════════════════════════
# READER EMAILS
# ══════════════════════════════════════════════════════════════════

def build_reader_welcome_email(
    user_name: str,
    package_name: str = "Free",
    is_paid: bool = False,
) -> dict:
    """
    Reader signup welcome email.

    Sent when:
      - Free user activates the Free package
      - Paid user completes payment for Basic / Regular / Premium

    Args:
        user_name: Reader's name (from Clerk)
        package_name: Their subscribed package
        is_paid: True for paid subscriptions, False for Free
    """
    content = _heading(f"Welcome to Firstchapter, {user_name}.")

    if is_paid:
        content += _para(
            f"Your subscription to the <strong>{package_name}</strong> plan is now active. "
            f"You can begin querying our entire library of licensed books immediately."
        )
    else:
        content += _para(
            "Your free account is ready. You can now begin exploring our library of licensed books "
            "and querying them in natural language."
        )

    content += _para(
        "Firstchapter is designed to help you engage with books in a new way — ask questions, "
        "explore themes, and get cited answers from specific chapters."
    )

    content += _info_box(
        "<strong>Getting started:</strong><br>"
        "1. Search for any topic from the homepage<br>"
        "2. Select one or more books to discuss<br>"
        "3. Ask your question — answers come with full citations"
    )

    content += _btn("Open Firstchapter", APP_BASE_URL)

    content += _para(
        f"If you have any questions, please write to us at "
        f'<a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN}; text-decoration:none;">{SUPPORT_EMAIL}</a>.',
        muted=True,
    )

    subject = f"Welcome to Firstchapter — your {package_name} plan is active" if is_paid \
              else "Welcome to Firstchapter"

    text = f"""Welcome to Firstchapter, {user_name}.

{'Your subscription to the ' + package_name + ' plan is now active.' if is_paid else 'Your free account is ready.'}

Getting started:
  1. Search for any topic from the homepage
  2. Select one or more books to discuss
  3. Ask your question — answers come with full citations

Open Firstchapter: {APP_BASE_URL}

If you have any questions, please write to us at {SUPPORT_EMAIL}.
"""

    return {
        "subject": subject,
        "html": _wrap_layout(content, preheader=f"Your {package_name} plan is active. Start querying books now."),
        "text": text,
        "tags": {"category": "welcome", "user_type": "reader", "package": package_name.lower()},
    }


def build_reader_payment_receipt_email(
    user_name: str,
    package_name: str,
    amount_inr: int,
    payment_id: str,
    billing_cycle: str = "monthly",
) -> dict:
    """
    Reader payment confirmation / receipt.

    Sent after successful Razorpay payment for a paid subscription.

    Args:
        user_name: Reader's name
        package_name: Plan they subscribed to
        amount_inr: Amount paid in rupees (whole rupees, not paise)
        payment_id: Razorpay payment ID for reference
        billing_cycle: "monthly" or "yearly"
    """
    content = _heading("Payment received — thank you.")
    content += _para(
        f"Dear {user_name},<br><br>"
        f"This email confirms receipt of your payment for the <strong>{package_name}</strong> plan."
    )

    content += _info_box(
        f"<strong>Payment summary</strong><br>"
        f"Plan: {package_name} ({billing_cycle})<br>"
        f"Amount: ₹{amount_inr:,}<br>"
        f"Payment ID: {payment_id}"
    )

    content += _para("Your subscription is active and ready to use.")
    content += _btn("Open Firstchapter", APP_BASE_URL)

    text = f"""Payment received — thank you.

Dear {user_name},

This email confirms receipt of your payment for the {package_name} plan.

Payment summary:
  Plan: {package_name} ({billing_cycle})
  Amount: ₹{amount_inr:,}
  Payment ID: {payment_id}

Your subscription is active and ready to use.

Open Firstchapter: {APP_BASE_URL}
"""

    return {
        "subject": f"Payment received — {package_name} plan activated",
        "html": _wrap_layout(content, preheader=f"₹{amount_inr:,} for the {package_name} plan."),
        "text": text,
        "tags": {"category": "payment_receipt", "user_type": "reader", "package": package_name.lower()},
    }


# ══════════════════════════════════════════════════════════════════
# INSTITUTION EMAILS
# ══════════════════════════════════════════════════════════════════

def build_institution_application_received_email(
    contact_name: str,
    institution_name: str,
) -> dict:
    """
    Sent when an institution submits its onboarding application.
    Acknowledges receipt and sets expectation for next steps.
    """
    content = _heading("Application received.")
    content += _para(
        f"Dear {contact_name},<br><br>"
        f"We have received your institutional application for <strong>{institution_name}</strong>. "
        f"Our team will review the details and contact you within 2 business days."
    )

    content += _info_box(
        "<strong>What happens next</strong><br>"
        "1. Our team verifies your institution details<br>"
        "2. We may reach out for any additional information<br>"
        "3. Once approved, you will receive credentials and onboarding instructions"
    )

    content += _para(
        f"If you have questions in the meantime, please write to "
        f'<a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN}; text-decoration:none;">{SUPPORT_EMAIL}</a>.',
        muted=True,
    )

    text = f"""Application received.

Dear {contact_name},

We have received your institutional application for {institution_name}.
Our team will review the details and contact you within 2 business days.

What happens next:
  1. Our team verifies your institution details
  2. We may reach out for any additional information
  3. Once approved, you will receive credentials and onboarding instructions

Questions? Write to {SUPPORT_EMAIL}.
"""

    return {
        "subject": f"Application received — {institution_name}",
        "html": _wrap_layout(content, preheader="We have received your application. Review takes ~2 business days."),
        "text": text,
        "tags": {"category": "institution_application", "stage": "received"},
    }


def build_institution_approved_email(
    contact_name: str,
    institution_name: str,
    package_name: str,
    free_readers: int,
) -> dict:
    """Sent when platform admin approves an institutional application."""
    content = _heading(f"Welcome to Firstchapter, {institution_name}.")
    content += _para(
        f"Dear {contact_name},<br><br>"
        f"Your institutional application has been approved. The <strong>{package_name}</strong> "
        f"subscription is now active for your institution."
    )

    content += _info_box(
        f"<strong>Your subscription</strong><br>"
        f"Plan: {package_name}<br>"
        f"Included readers: {free_readers:,}<br>"
        f"Subscription period: 1 year from today"
    )

    content += _para("You may now sign in to your institution dashboard to begin onboarding students.")
    content += _btn("Open Institution Dashboard", f"{APP_BASE_URL}/institution")

    content += _para(
        "From the dashboard, you can approve student applications, invite students directly, "
        "configure fair-usage policies, and monitor usage across your institution."
    )

    text = f"""Welcome to Firstchapter, {institution_name}.

Dear {contact_name},

Your institutional application has been approved. The {package_name} subscription is now active for your institution.

Your subscription:
  Plan: {package_name}
  Included readers: {free_readers:,}
  Subscription period: 1 year from today

You may now sign in to your institution dashboard to begin onboarding students.

Dashboard: {APP_BASE_URL}/institution

From the dashboard, you can approve student applications, invite students directly,
configure fair-usage policies, and monitor usage across your institution.
"""

    return {
        "subject": f"Application approved — {institution_name}",
        "html": _wrap_layout(content, preheader=f"Your {package_name} subscription is active."),
        "text": text,
        "tags": {"category": "institution_application", "stage": "approved"},
    }


def build_institution_rejected_email(
    contact_name: str,
    institution_name: str,
    reason: Optional[str] = None,
) -> dict:
    """Sent when platform admin rejects an institutional application."""
    content = _heading("Update on your application.")
    content += _para(
        f"Dear {contact_name},<br><br>"
        f"Thank you for your interest in Firstchapter. After reviewing the application "
        f"submitted for <strong>{institution_name}</strong>, we are unable to approve it at this time."
    )

    if reason:
        content += _info_box(
            f"<strong>Reason</strong><br>{reason}",
            accent="#E74C3C",
        )

    content += _para(
        "If you believe this decision was made in error, or if circumstances change, please "
        f'reach out to us at <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN}; text-decoration:none;">{SUPPORT_EMAIL}</a>. '
        "We are happy to revisit applications when new information is available."
    )

    text = f"""Update on your application.

Dear {contact_name},

Thank you for your interest in Firstchapter. After reviewing the application
submitted for {institution_name}, we are unable to approve it at this time.

{('Reason: ' + reason) if reason else ''}

If you believe this decision was made in error, or if circumstances change, please
reach out to us at {SUPPORT_EMAIL}. We are happy to revisit applications when new
information is available.
"""

    return {
        "subject": f"Update on your Firstchapter application — {institution_name}",
        "html": _wrap_layout(content, preheader="Your application could not be approved at this time."),
        "text": text,
        "tags": {"category": "institution_application", "stage": "rejected"},
    }


# ══════════════════════════════════════════════════════════════════
# STUDENT EMAILS (institutional)
# ══════════════════════════════════════════════════════════════════

def build_student_approved_email(
    student_name: str,
    institution_name: str,
    validity_years: int,
    monthly_token_allocation: int,
) -> dict:
    """
    Sent when an institution admin approves a student's application
    to join their institution.
    """
    # Format allocation in human-readable form
    if monthly_token_allocation >= 1_000_000:
        alloc_str = f"{monthly_token_allocation / 1_000_000:.1f}M tokens"
    elif monthly_token_allocation >= 1_000:
        alloc_str = f"{monthly_token_allocation / 1_000:.0f}K tokens"
    else:
        alloc_str = f"{monthly_token_allocation:,} tokens"

    content = _heading(f"Welcome to Firstchapter via {institution_name}.")
    content += _para(
        f"Dear {student_name},<br><br>"
        f"Your application to join Firstchapter through <strong>{institution_name}</strong> has been approved. "
        f"You may now sign in and begin querying our library of licensed books."
    )

    content += _info_box(
        f"<strong>Your access details</strong><br>"
        f"Institution: {institution_name}<br>"
        f"Monthly token allocation: {alloc_str}<br>"
        f"Access validity: {validity_years} year{'s' if validity_years != 1 else ''}"
    )

    content += _btn("Sign in to Firstchapter", f"{APP_BASE_URL}/sign-in")

    content += _para(
        "<strong>Fair usage policy:</strong> Your monthly token allocation resets on the 1st of each month. "
        "If you need additional tokens, please contact your institution administrator.",
        muted=True,
    )

    text = f"""Welcome to Firstchapter via {institution_name}.

Dear {student_name},

Your application to join Firstchapter through {institution_name} has been approved.
You may now sign in and begin querying our library of licensed books.

Your access details:
  Institution: {institution_name}
  Monthly token allocation: {alloc_str}
  Access validity: {validity_years} year{'s' if validity_years != 1 else ''}

Sign in: {APP_BASE_URL}/sign-in

Fair usage policy: Your monthly token allocation resets on the 1st of each month.
If you need additional tokens, please contact your institution administrator.
"""

    return {
        "subject": f"Your Firstchapter access is approved — {institution_name}",
        "html": _wrap_layout(content, preheader=f"Your access through {institution_name} is now active."),
        "text": text,
        "tags": {"category": "student_approval", "stage": "approved"},
    }


def build_student_invite_email(
    student_name: str,
    institution_name: str,
    admin_name: str,
    signup_url: str,
) -> dict:
    """
    Sent when an institution admin proactively invites a student
    via the admin-add-student flow (not from a self-applied request).
    """
    content = _heading(f"You're invited to Firstchapter.")
    content += _para(
        f"Dear {student_name},<br><br>"
        f"<strong>{admin_name}</strong> from <strong>{institution_name}</strong> has invited you to join Firstchapter — "
        f"an AI-powered platform for querying licensed books. Your access has already been pre-approved."
    )

    content += _para(
        "To complete your registration, please click the button below to set up your account."
    )

    content += _btn("Set up your account", signup_url)

    content += _info_box(
        "<strong>What is Firstchapter?</strong><br>"
        "Firstchapter lets you ask natural-language questions of books in our library. "
        "Answers come with full citations from specific chapters, so you always know your source."
    )

    content += _para(
        f"If you weren't expecting this invitation or have questions, please reach out to "
        f'<a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN}; text-decoration:none;">{SUPPORT_EMAIL}</a> '
        f"or contact {admin_name} directly.",
        muted=True,
    )

    text = f"""You're invited to Firstchapter.

Dear {student_name},

{admin_name} from {institution_name} has invited you to join Firstchapter — an
AI-powered platform for querying licensed books. Your access has already been
pre-approved.

To complete your registration, click here: {signup_url}

What is Firstchapter?
Firstchapter lets you ask natural-language questions of books in our library.
Answers come with full citations from specific chapters, so you always know your source.

If you weren't expecting this invitation or have questions, please reach out to
{SUPPORT_EMAIL} or contact {admin_name} directly.
"""

    return {
        "subject": f"{admin_name} invited you to Firstchapter via {institution_name}",
        "html": _wrap_layout(content, preheader=f"{admin_name} from {institution_name} has pre-approved your access."),
        "text": text,
        "tags": {"category": "student_invite", "stage": "sent"},
    }
