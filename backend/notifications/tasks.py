import logging
from datetime import timedelta

from celery import shared_task
from django.core.mail import send_mail, get_connection
from django.core.mail.backends.smtp import EmailBackend
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from datetime import datetime
from collections import defaultdict

import pytz

from django.db.models import Q

from accounts.models import User
from events.models import Event, DeletedEventLog
from clubs.models import Club
from .utils import convert_to_local, is_within_minute, is_notification_due_today, format_event_datetime

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=60,
    retry_backoff_max=300,
    max_retries=3,
)
def dispatch_notifications(self):
    """
    Celery task to dispatch email notifications to users.
    Runs every minute via Celery Beat.

    Sends ALL users with notifications enabled a digest of events
    from ANY club, as long as:
      1. It is the user's notification time (or overdue today).
      2. The event was added or updated in the 24 hours preceding the notification.
    """
    now_utc = timezone.now()

    # All users who have opted into notifications (no club requirement)
    users = (
        User.objects
        .filter(notification_enabled=True, notification_time__isnull=False)
        .select_related('club', 'sub_club')
    )

    # ---------------------------------------------------------------
    # Step 1: Determine which users are eligible RIGHT NOW
    # ---------------------------------------------------------------
    eligible_users = []
    for user in users:
        try:
            local_now = convert_to_local(now_utc, user.timezone)

            # Primary check: exact minute match
            if is_within_minute(local_now.time(), user.notification_time):
                eligible_users.append(user)
                continue

            # Fallback: notification is due today but hasn't been sent
            if is_notification_due_today(local_now, user.notification_time, user.last_notification_sent_at, user.timezone):
                eligible_users.append(user)
        except Exception as e:
            logger.error("Error checking eligibility for user %s: %s", user.email, e)

    if not eligible_users:
        return "No users eligible for notification at this time."

    logger.info("Found %d eligible user(s) for notification dispatch.", len(eligible_users))

    # ---------------------------------------------------------------
    # Step 2: Send notification to each eligible user
    # ---------------------------------------------------------------
    sent_count = 0
    for user in eligible_users:
        try:
            user_last_sent = user.last_notification_sent_at or timezone.make_aware(datetime(1970, 1, 1))

            # Compute the user's notification datetime for today (in their timezone)
            try:
                user_tz = pytz.timezone(user.timezone)
            except Exception:
                user_tz = pytz.UTC

            local_now = convert_to_local(now_utc, user.timezone)
            notif_today = user_tz.localize(
                datetime.combine(local_now.date(), user.notification_time)
            )

            # Determine the 24-hour window before the user's notification time today
            window_start = notif_today - timedelta(hours=24)
            window_start_utc = window_start.astimezone(pytz.UTC)

            # Effective start is whichever is more recent: the user's last notification time,
            # or 24 hours ago (prevents spamming all historical events on the first day).
            effective_start_utc = max(window_start_utc, user_last_sent)

            # Query events across ALL clubs that:
            # - Were added or updated in the 24h period before the notification
            # - Are upcoming (not completely in the past)
            new_events = list(
                Event.objects
                .filter(
                    Q(created_at__gt=effective_start_utc, created_at__lte=now_utc) |
                    Q(updated_at__gt=effective_start_utc, updated_at__lte=now_utc)
                )
                .filter(end__gte=now_utc)
                .select_related('club', 'created_by', 'updated_by')
                .order_by('start')
            )
            
            # Query cancelled events: deleted in the 24h period, still upcoming, 
            # and were created BEFORE the 24h window (meaning the user already got notified about them)
            cancelled_events = list(
                DeletedEventLog.objects
                .filter(
                    deleted_at__gt=effective_start_utc,
                    deleted_at__lte=now_utc,
                    end__gte=now_utc,
                    event_created_at__lte=effective_start_utc
                )
                .order_by('start')
            )

            if not new_events and not cancelled_events:
                logger.debug("No relevant events for user %s.", user.email)
                # Ensure we record that we checked today so they don't get immediate emails later today
                user.last_notification_sent_at = now_utc
                user.save(update_fields=['last_notification_sent_at'])
                continue

            # Pre-fetch all clubs to a dict by name for cancelled events mapping
            all_clubs = {c.name: c for c in Club.objects.all()}
            
            # Group by Club object (or None for unknown clubs)
            club_grouped = defaultdict(lambda: {'events': [], 'cancelled': []})
            
            for event in new_events:
                club_grouped[event.club]['events'].append(event)
                
            for cancelled_event in cancelled_events:
                club = all_clubs.get(cancelled_event.club_name)
                club_grouped[club]['cancelled'].append(cancelled_event)

            logger.info(
                "Sending %d new/updated event(s) and %d cancelled event(s) to user %s across %d club(s).",
                len(new_events), len(cancelled_events), user.email, len(club_grouped)
            )

            user_sent_count = 0
            for club, grouped in club_grouped.items():
                evts = grouped['events']
                canc = grouped['cancelled']
                if not evts and not canc:
                    continue
                
                success = send_digest_email(user, evts, canc, club)
                if success:
                    user_sent_count += 1
            
            if user_sent_count > 0:
                user.last_notification_sent_at = now_utc
                user.save(update_fields=['last_notification_sent_at'])
                sent_count += 1

        except Exception as e:
            logger.error("Error processing notification for %s: %s", user.email, e, exc_info=True)

    result = f"Sent {sent_count} notification(s)"
    logger.info(result)
    return result


def send_digest_email(user, events, cancelled_events=None, club=None):
    """
    Send HTML email digest with upcoming events to a user.

    Args:
        user: User object
        events: list of Event objects (from any club)
        cancelled_events: list of DeletedEventLog objects
        club: The Club object these events belong to (for custom sender email)

    Returns:
        bool: True if email sent successfully
    """
    if cancelled_events is None:
        cancelled_events = []
    try:
        # Prepare event data for template
        created_events = []
        updated_events = []
        for event in events:
            # If the difference between updated_at and created_at is more than 2 seconds, consider it an update
            is_updated = False
            if hasattr(event, 'created_at') and hasattr(event, 'updated_at') and event.created_at and event.updated_at:
                is_updated = abs((event.updated_at - event.created_at).total_seconds()) > 2

            if is_updated and hasattr(event, 'updated_by') and event.updated_by:
                author_name = f"{event.updated_by.first_name} {event.updated_by.last_name}".strip() or event.updated_by.username
            else:
                author_name = f"{event.created_by.first_name} {event.created_by.last_name}".strip() or event.created_by.username

            event_data = {
                'title': event.title,
                'club_name': event.club.name,
                'description': event.description,
                'datetime': format_event_datetime(event.start, user.timezone, user.time_format),
                'end_datetime': format_event_datetime(event.end, user.timezone, user.time_format),
                'location': event.location,
                'author': author_name,
            }
            if is_updated:
                updated_events.append(event_data)
            else:
                created_events.append(event_data)
                
        cancelled_event_data = []
        for event in cancelled_events:
            cancelled_event_data.append({
                'title': event.title,
                'club_name': event.club_name,
                'datetime': format_event_datetime(event.start, user.timezone, user.time_format),
                'end_datetime': format_event_datetime(event.end, user.timezone, user.time_format),
            })

        # Render HTML email
        total_events = len(events) + len(cancelled_events)
        html_content = render_to_string('email_digest.html', {
            'user': user,
            'created_events': created_events,
            'updated_events': updated_events,
            'cancelled_events': cancelled_event_data,
            'event_count': total_events,
            'frontend_url': settings.FRONTEND_URL,
            'club': club,
        })

        connection = None
        from_email = settings.DEFAULT_FROM_EMAIL
        
        if club and club.sender_email and club.get_sender_password():
            try:
                connection = EmailBackend(
                    host='smtp.gmail.com',
                    port=587,
                    username=club.sender_email,
                    password=club.get_sender_password(),
                    use_tls=True,
                    fail_silently=False,
                )
                from_email = f"{club.name} <{club.sender_email}>"
            except Exception as e:
                logger.error("Failed to setup custom email for club %s: %s", club.name, e)
                connection = None
                from_email = settings.DEFAULT_FROM_EMAIL

        subject_prefix = f"Upcoming Events from {club.name}" if club else "Upcoming Events - CampusCalendar"

        # Send email
        send_mail(
            subject=subject_prefix,
            message=(
                f"You have {total_events} event update(s). "
                f"Visit {settings.FRONTEND_URL} to view details."
            ),
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_content,
            connection=connection,
            fail_silently=False,
        )

        logger.info("Digest email sent to %s (%d total updates, from %s)", user.email, total_events, from_email)
        return True

    except Exception as e:
        logger.error("Failed to send email to %s: %s", user.email, e, exc_info=True)
        return False
