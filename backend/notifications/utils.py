import pytz
from datetime import datetime, time, date
from django.conf import settings


def convert_to_local(utc_time, timezone_str):
    """
    Convert UTC datetime to user's local timezone.
    
    Args:
        utc_time: datetime object in UTC
        timezone_str: timezone string (e.g., 'Asia/Kolkata')
    
    Returns:
        datetime object in user's local timezone
    """
    try:
        user_tz = pytz.timezone(timezone_str)
        return utc_time.astimezone(user_tz)
    except Exception:
        # Fallback to UTC if timezone is invalid
        return utc_time


def is_within_minute(time1, time2):
    """
    Check if two time objects are within the same minute.
    
    Args:
        time1: time object
        time2: time object
    
    Returns:
        bool: True if times are within the same minute
    """
    if not time1 or not time2:
        return False
    
    return time1.hour == time2.hour and time1.minute == time2.minute


def is_notification_due_today(local_now, notification_time, last_sent_utc, user_tz_str):
    """
    Fallback checker: determine if a user's notification is due today 
    but hasn't been sent yet. This prevents missed notifications if 
    Celery Beat skips a minute.

    Args:
        local_now: datetime in user's local timezone
        notification_time: time object (user's preferred notification time)
        last_sent_utc: datetime (UTC) of last notification sent, or None
        user_tz_str: timezone string (e.g., 'Asia/Kolkata')
    
    Returns:
        bool: True if notification should be sent now
    """
    if not notification_time:
        return False

    # Check if current local time is past the notification time today
    if local_now.time() < notification_time:
        return False

    # If never sent, it's definitely due
    if not last_sent_utc:
        return True

    # Check if last notification was sent before today in user's local tz
    try:
        user_tz = pytz.timezone(user_tz_str)
        last_sent_local = last_sent_utc.astimezone(user_tz)
        return last_sent_local.date() < local_now.date()
    except Exception:
        return False


def format_event_datetime(dt, timezone_str, time_format='12h'):
    """
    Format event datetime for display in user's timezone.
    
    Args:
        dt: datetime object
        timezone_str: timezone string
        time_format: '12h' or '24h'
    
    Returns:
        str: Formatted datetime string
    """
    try:
        user_tz = pytz.timezone(timezone_str)
        local_dt = dt.astimezone(user_tz)
    except Exception:
        local_dt = dt
        
    if time_format == '24h':
        return local_dt.strftime('%B %d, %Y at %H:%M')
    return local_dt.strftime('%B %d, %Y at %I:%M %p')
