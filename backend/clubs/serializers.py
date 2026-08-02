from rest_framework import serializers
from .models import Club


class ClubSerializer(serializers.ModelSerializer):
    """
    Serializer for Club model including nested sub-clubs
    """
    sub_clubs = serializers.SerializerMethodField()
    parent_name = serializers.ReadOnlyField(source='parent.name')
    
    sender_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_custom_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = ['id', 'slug', 'name', 'color', 'parent', 'parent_name', 'order', 'sub_clubs', 'sender_email', 'sender_password', 'has_custom_email']
        read_only_fields = ['id', 'has_custom_email']

    def get_has_custom_email(self, obj):
        return bool(obj.sender_email and obj.encrypted_sender_password)

    def get_sub_clubs(self, obj):
        # Only return sub_clubs for main clubs to avoid deep recursion if not needed
        # and sort by the 'order' field
        if not obj.parent:
            sub_clubs = obj.sub_clubs.all().order_by('order', 'name')
            return ClubSerializer(sub_clubs, many=True).data
        return []

    def create(self, validated_data):
        password = validated_data.pop('sender_password', None)
        club = super().create(validated_data)
        if password is not None:
            club.set_sender_password(password)
            club.save()
        return club

    def update(self, instance, validated_data):
        password = validated_data.pop('sender_password', None)
        club = super().update(instance, validated_data)
        if password is not None:
            if password == "" and not club.sender_email:
                club.set_sender_password(None)
            else:
                club.set_sender_password(password)
            club.save()
        return club
