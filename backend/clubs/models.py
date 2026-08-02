from django.db import models
from cryptography.fernet import Fernet
from django.conf import settings


class Club(models.Model):
    """
    Represents a college club/organization
    """
    slug = models.SlugField(unique=True, max_length=100)
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=7, default="#3B82F6", help_text="Hex color code for calendar display")
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='sub_clubs')
    order = models.IntegerField(default=0, help_text="Manual display order")
    
    sender_email = models.EmailField(null=True, blank=True, help_text="Custom sender email for club notifications")
    encrypted_sender_password = models.BinaryField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def set_sender_password(self, raw_password):
        if not raw_password:
            self.encrypted_sender_password = None
            return
        f = Fernet(settings.ENCRYPTION_KEY.encode('utf-8'))
        self.encrypted_sender_password = f.encrypt(raw_password.encode('utf-8'))

    def get_sender_password(self):
        if not self.encrypted_sender_password:
            return None
        f = Fernet(settings.ENCRYPTION_KEY.encode('utf-8'))
        token = bytes(self.encrypted_sender_password) if not isinstance(self.encrypted_sender_password, bytes) else self.encrypted_sender_password
        return f.decrypt(token).decode('utf-8')
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name
