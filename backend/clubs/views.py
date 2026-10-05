from rest_framework import generics, permissions, viewsets
from .models import Club
from .serializers import ClubSerializer


class ClubListView(generics.ListAPIView):
    """
    List all main clubs with their sub-clubs (public endpoint)
    """
    serializer_class = ClubSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Only return main clubs (no parent) and order by the new order field
        return Club.objects.filter(parent__isnull=True).order_by('order', 'name')

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        import uuid
        
        # Get current clubs cache version
        version = cache.get('clubs_cache_version')
        if not version:
            version = str(uuid.uuid4())
            cache.set('clubs_cache_version', version, timeout=None)
            
        cache_key = f"clubs_list_public_{version}"
        
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            from rest_framework.response import Response
            return Response(cached_data)
            
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=86400)  # Cache for 24 hours
        return response


class ClubManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Super Admin to manage clubs and sub-clubs
    """
    queryset = Club.objects.all().order_by('order', 'name')
    serializer_class = ClubSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        # Super admin only
        club = serializer.save()
        from accounts.models import ActivityLog
        ActivityLog.objects.create(
            actor=self.request.user,
            action='CLUB_CREATE',
            entity_type='Club',
            entity_id=str(club.id),
            details={'name': club.name, 'color': club.color}
        )

    def perform_update(self, serializer):
        club = serializer.save()
        from accounts.models import ActivityLog
        ActivityLog.objects.create(
            actor=self.request.user,
            action='CLUB_UPDATE',
            entity_type='Club',
            entity_id=str(club.id),
            details={'name': club.name, 'color': club.color}
        )
