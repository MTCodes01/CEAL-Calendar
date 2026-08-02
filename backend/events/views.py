import logging
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from .models import Event
from .serializers import EventSerializer, EventCreateSerializer
from .permissions import IsClubMemberOrReadOnly, IsSameClubMember

logger = logging.getLogger(__name__)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Event CRUD operations with club-based permissions.
    """
    queryset = Event.objects.select_related('club', 'created_by').prefetch_related('collaborating_clubs').all()
    permission_classes = [permissions.IsAuthenticated, IsClubMemberOrReadOnly, IsSameClubMember]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EventCreateSerializer
        return EventSerializer

    def create(self, request, *args, **kwargs):
        """
        Override to return the full EventSerializer in the 201 response
        (EventCreateSerializer is write-only and lacks id/club fields).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Re-serialize with the full read serializer so id/club are included
        output = EventSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)
    
    def get_queryset(self):
        """
        Filter events by date range if provided in query params.
        """
        queryset = super().get_queryset()
        
        # Get query parameters
        start_param = self.request.query_params.get('start', None)
        end_param = self.request.query_params.get('end', None)
        club_ids = self.request.query_params.get('clubs', None)
        
        # Filter by date range (for calendar view)
        if start_param and end_param:
            try:
                start_dt = parse_datetime(start_param)
                end_dt = parse_datetime(end_param)
                
                if start_dt and end_dt:
                    # Query events that overlap with the date range
                    queryset = queryset.filter(
                        start__lte=end_dt,
                        end__gte=start_dt
                    )
            except (ValueError, TypeError):
                logger.warning("Invalid date params: start=%s, end=%s", start_param, end_param)
        
        # Filter by club IDs
        if club_ids:
            club_id_list = [int(cid) for cid in club_ids.split(',') if cid.isdigit()]
            if club_id_list:
                queryset = queryset.filter(club_id__in=club_id_list)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Auto-fill club and created_by from current user.
        Main-club users may optionally supply club_id to target one of their sub-clubs.
        Extra-clubs users may supply club_id to target any of their extra clubs.
        Saves collaborating_club_ids as the collaborating_clubs M2M relation.
        """
        user = self.request.user

        # Pop optional fields from validated data before saving
        club_id = serializer.validated_data.pop('club_id', None)
        collaborating_club_ids = serializer.validated_data.pop('collaborating_club_ids', [])

        from clubs.models import Club as ClubModel

        # Collect all club IDs the user legitimately has write-access to
        extra_club_ids = list(user.extra_clubs.values_list('id', flat=True))

        if user.is_superuser:
            if not club_id:
                raise PermissionDenied("Superusers must specify a club_id when creating events.")
            try:
                club = ClubModel.objects.get(pk=club_id)
            except ClubModel.DoesNotExist:
                raise PermissionDenied("Invalid club_id.")

        elif club_id and club_id in extra_club_ids:
            # Any user (including sub_club role) can target one of their extra_clubs
            try:
                club = ClubModel.objects.get(pk=club_id)
            except ClubModel.DoesNotExist:
                raise PermissionDenied("Invalid club_id.")

        elif user.sub_club:
            # Sub-club role with no extra_club override: use their assigned sub-club
            if club_id and club_id != user.sub_club.id:
                raise PermissionDenied("You can only create events for your assigned clubs.")
            club = user.sub_club

        elif user.club:
            # Main-club role: default to main club, but allow targeting a direct sub-club
            if club_id and club_id != user.club.id:
                try:
                    target = ClubModel.objects.get(pk=club_id)
                except ClubModel.DoesNotExist:
                    raise PermissionDenied("Invalid club_id.")
                if target.parent_id != user.club.id:
                    raise PermissionDenied("You can only create events for your club and its sub-clubs.")
                club = target
            else:
                club = user.club

        else:
            # Extra-clubs only users
            if club_id and club_id in extra_club_ids:
                try:
                    club = ClubModel.objects.get(pk=club_id)
                except ClubModel.DoesNotExist:
                    raise PermissionDenied("Invalid club_id.")
            elif extra_club_ids:
                club = ClubModel.objects.get(pk=extra_club_ids[0])
            else:
                raise PermissionDenied("You must be a member of a club to create events.")

        event = serializer.save(
            club=club,
            created_by=user
        )

        # Set collaborating clubs
        if collaborating_club_ids:
            from clubs.models import Club as ClubModel
            collab_clubs = ClubModel.objects.filter(pk__in=collaborating_club_ids)
            event.collaborating_clubs.set(collab_clubs)

        logger.info("Event created: '%s' (id=%s) by %s in club '%s'", event.title, event.id, user.email, club.name)
    
    def perform_update(self, serializer):
        """
        Ensure user can only update events of their own club or its sub-clubs.
        Main-club role: can edit main club events AND any of its sub-club events.
        Sub-club role: can only edit their specific sub-club's events.
        Extra-clubs: can edit events belonging to their extra clubs.
        Also saves updated collaborating_club_ids.
        """
        user = self.request.user
        event = serializer.instance

        # collaborating_club_ids is now declared on EventSerializer, so it arrives in validated_data
        collaborating_club_ids = serializer.validated_data.pop('collaborating_club_ids', None)

        if not user.is_superuser:
            extra_club_ids = list(user.extra_clubs.values_list('id', flat=True))

            # Allow edit if the event's club is in the user's extra_clubs (takes priority)
            if event.club.id in extra_club_ids:
                pass  # permitted
            elif user.sub_club:
                # Sub-club role: only their exact sub-club
                if user.sub_club.id != event.club.id:
                    raise PermissionDenied("You can only edit events for your assigned clubs.")
            elif user.club:
                # Main-club role: own club OR any direct sub-club
                is_own_club = event.club.id == user.club.id
                is_sub_club = event.club.parent_id == user.club.id
                if not (is_own_club or is_sub_club):
                    raise PermissionDenied("You can only edit events for your club and its sub-clubs.")
            else:
                raise PermissionDenied("You must be a member of a club to edit events.")

        updated_event = serializer.save(club=event.club, created_by=event.created_by)

        # Update collaborating clubs whenever the field is present in the payload
        if collaborating_club_ids is not None:
            from clubs.models import Club as ClubModel
            collab_clubs = ClubModel.objects.filter(pk__in=collaborating_club_ids)
            updated_event.collaborating_clubs.set(collab_clubs)

        logger.info("Event updated: '%s' (id=%s) by %s", event.title, event.id, user.email)

    def perform_destroy(self, instance):
        """
        Ensure user can only delete events of their own club or its sub-clubs.
        Main-club role: can delete main club events AND any of its sub-club events.
        Sub-club role: can only delete their specific sub-club's events.
        Extra-clubs: can delete events for their extra clubs.
        """
        user = self.request.user
        if not user.is_superuser:
            extra_club_ids = list(user.extra_clubs.values_list('id', flat=True))
            
            # Allow delete if the event's club is in the user's extra_clubs
            if instance.club.id in extra_club_ids:
                pass # permitted
            elif user.sub_club:
                # Sub-club role: strict — only their exact sub-club
                if user.sub_club.id != instance.club.id:
                    raise PermissionDenied("You can only delete events for your assigned clubs.")
            elif user.club:
                # Main-club role: own club OR any direct sub-club
                is_own_club = instance.club.id == user.club.id
                is_sub_club = instance.club.parent_id == user.club.id
                if not (is_own_club or is_sub_club):
                    raise PermissionDenied("You can only delete events for your club and its sub-clubs.")
            else:
                raise PermissionDenied("You must be a member of a club to delete events.")
                
        # Log deletion if the event is in the future
        from django.utils import timezone
        from .models import DeletedEventLog
        
        if instance.end >= timezone.now():
            DeletedEventLog.objects.create(
                title=instance.title,
                club_name=instance.club.name,
                start=instance.start,
                end=instance.end,
                event_created_at=instance.created_at
            )
            
        logger.info("Event deleted: '%s' (id=%s) by %s", instance.title, instance.id, user.email)
        instance.delete()
