import random
from datetime import time
from django.contrib.auth.models import AbstractUser
from django.db import models
from clubs.models import Club


def get_random_notification_time():
    """
    Returns a random time between 07:00 and 10:00.
    This helps distribute the email load across a 3-hour window.
    """
    hour = random.randint(7, 9)
    minute = random.randint(0, 59)
    return time(hour, minute)


class User(AbstractUser):
    """
    Custom User model with club affiliation and notification preferences
    """
    email = models.EmailField(unique=True)
    club = models.ForeignKey(
        Club,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members'
    )
    sub_club = models.ForeignKey(
        Club,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='sub_club_members'
    )
    extra_clubs = models.ManyToManyField(
        Club,
        blank=True,
        related_name='extra_members',
        help_text='Additional clubs this user can create/manage events for'
    )
    
    # Notification settings
    notification_enabled = models.BooleanField(default=True)
    notification_time = models.TimeField(
        default=get_random_notification_time,
        null=True,
        blank=True,
        help_text="Time to send daily notification (in user's timezone)"
    )
    timezone = models.CharField(
        max_length=64,
        default="Asia/Kolkata",
        help_text="User's timezone (e.g., 'Asia/Kolkata', 'America/New_York')"
    )
    last_notification_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="UTC timestamp of last notification sent"
    )
    
    # Time format preference
    TIME_FORMAT_CHOICES = [
        ('12h', '12 Hour'),
        ('24h', '24 Hour'),
    ]
    time_format = models.CharField(
        max_length=3,
        choices=TIME_FORMAT_CHOICES,
        default='12h',
        help_text="User's preferred time format"
    )
    
    # Use email as username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        ordering = ['email']
    
    def __str__(self):
        return self.email


class ActivityLog(models.Model):
    """
    Log of administrative and event actions.
    """
    ACTION_CHOICES = [
        ('EVENT_CREATE', 'Event Created'),
        ('EVENT_UPDATE', 'Event Updated'),
        ('EVENT_DELETE', 'Event Deleted'),
        ('CLUB_UPDATE', 'Club Settings Updated'),
        ('CLUB_CREATE', 'Club Created'),
        ('USER_ACCESS', 'User Access Updated'),
    ]
    actor = models.ForeignKey(
        'accounts.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50, help_text="e.g. 'Event', 'Club', 'User'")
    entity_id = models.CharField(max_length=50)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        
    def __str__(self):
        return f"{self.actor} - {self.action} - {self.entity_type} ({self.entity_id})"
