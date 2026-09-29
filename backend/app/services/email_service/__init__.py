from app.services.email_service.appointment import send_appointment_email  # noqa: F401
from app.services.email_service.common import (  # noqa: F401
    _customer_for_request,
    _send_mail,
    _user,
)
from app.services.email_service.decision import send_decision_email  # noqa: F401
from app.services.email_service.orders import send_order_confirmation_email  # noqa: F401