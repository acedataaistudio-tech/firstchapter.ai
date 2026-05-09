"""
Email test endpoint — sends sample emails to a target address so you
can verify the email infrastructure end-to-end without needing to
trigger real signup/approval flows.

Mount this temporarily during development. Remove from main.py before
production launch (or gate behind an admin check).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

from utils.email_service import send_email
from utils.email_templates import (
    build_reader_welcome_email,
    build_reader_payment_receipt_email,
    build_institution_application_received_email,
    build_institution_approved_email,
    build_institution_rejected_email,
    build_student_approved_email,
    build_student_invite_email,
)

router = APIRouter()


class TestEmailRequest(BaseModel):
    template: str
    to: EmailStr
    name: Optional[str] = "Test User"
    institution_name: Optional[str] = "Test Institution"
    package_name: Optional[str] = "Basic"


# Sample data for each template — used when the request doesn't override
SAMPLE_DATA = {
    "reader_welcome_free": lambda r: build_reader_welcome_email(
        user_name=r.name, package_name="Free", is_paid=False,
    ),
    "reader_welcome_paid": lambda r: build_reader_welcome_email(
        user_name=r.name, package_name=r.package_name, is_paid=True,
    ),
    "reader_payment_receipt": lambda r: build_reader_payment_receipt_email(
        user_name=r.name,
        package_name=r.package_name,
        amount_inr=99 if r.package_name == "Basic" else 299 if r.package_name == "Regular" else 499,
        payment_id="pay_TEST1234567890",
        billing_cycle="monthly",
    ),
    "institution_application_received": lambda r: build_institution_application_received_email(
        contact_name=r.name, institution_name=r.institution_name,
    ),
    "institution_approved": lambda r: build_institution_approved_email(
        contact_name=r.name,
        institution_name=r.institution_name,
        package_name="Institution Basic",
        free_readers=1000,
    ),
    "institution_rejected": lambda r: build_institution_rejected_email(
        contact_name=r.name,
        institution_name=r.institution_name,
        reason="Sample rejection reason: Unable to verify institutional details from public records. Please resubmit with official affiliation documents.",
    ),
    "student_approved": lambda r: build_student_approved_email(
        student_name=r.name,
        institution_name=r.institution_name,
        validity_years=4,
        monthly_token_allocation=53_460_000,
    ),
    "student_invite": lambda r: build_student_invite_email(
        student_name=r.name,
        institution_name=r.institution_name,
        admin_name="Loganathan Arumugam",
        signup_url="https://www.firstchapter.ai/sign-up?invite=TEST_TOKEN",
    ),
}


@router.post("/admin/email/test")
async def send_test_email(request: TestEmailRequest):
    """
    Trigger a test send of any email template. Useful during development.

    Body:
        {
          "template": "reader_welcome_paid",
          "to": "your@email.com",
          "name": "Loganathan",
          "institution_name": "Chennai School Test",
          "package_name": "Premium"
        }

    Returns the result from Resend (success + message id, or error).
    """
    if request.template not in SAMPLE_DATA:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown template: {request.template}. Valid options: {list(SAMPLE_DATA.keys())}",
        )

    try:
        # Build the email content
        email = SAMPLE_DATA[request.template](request)

        # Send it
        result = send_email(
            to=request.to,
            subject=email["subject"],
            html=email["html"],
            text=email["text"],
            tags=email.get("tags"),
        )

        return {
            "template": request.template,
            "to": request.to,
            "subject": email["subject"],
            "send_result": result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.get("/admin/email/templates")
async def list_email_templates():
    """List all available email templates for testing."""
    return {
        "templates": list(SAMPLE_DATA.keys()),
        "usage": "POST /admin/email/test with {template, to, name, institution_name, package_name}",
    }
