from rest_framework import permissions


class IsClubMemberOrReadOnly(permissions.BasePermission):
    """
    Only club members can create events.
    Read-only access for all authenticated users.
    Superusers bypass all checks.
    Supports primary club, sub_club, and extra_clubs.
    """
    def has_permission(self, request, view):
        # Read permissions for everyone, including unauthenticated (guest) users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Superusers always allowed
        if request.user and request.user.is_superuser:
            return True

        # Write permissions for users with any club affiliation
        if not (request.user and request.user.is_authenticated):
            return False

        return (
            request.user.club is not None
            or request.user.sub_club is not None
            or request.user.extra_clubs.exists()
        )


class IsSameClubMember(permissions.BasePermission):
    """
    Strict RBAC for events:
    - Super Admin: All permissions.
    - Club Admin: Can only add/edit/delete events for their specific club and its sub-clubs.
    - Sub-Club Admin: Can only add/edit/delete events for their specific sub-club.
    - Extra-Clubs: Can add/edit/delete events for any of their extra clubs.
    - No Role: Read-only access.
    """
    def has_permission(self, request, view):
        # Read permissions for everyone, including unauthenticated (guest) users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Super admin can do anything
        if request.user.is_superuser:
            return True
            
        # For POST (create), check if user has any club affiliation
        if request.method == 'POST':
            return (
                request.user.club is not None
                or request.user.sub_club is not None
                or request.user.extra_clubs.exists()
            )
            
        return True  # Handled by has_object_permission for PUT/PATCH/DELETE

    def has_object_permission(self, request, view, obj):
        # Read permissions for everyone, including unauthenticated (guest) users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Super admin can do anything
        if request.user.is_superuser:
            return True

        # Extra_clubs check first — must come before sub_club so it isn't short-circuited
        extra_club_ids = list(request.user.extra_clubs.values_list('id', flat=True))
        if obj.club.id in extra_club_ids:
            return True

        # Check sub_club (more specific role)
        # If user has a sub_club role, they can ONLY manage events FOR THAT sub_club
        if request.user.sub_club:
            return obj.club.id == request.user.sub_club.id
            
        # Then check main club role
        # If user has a main club role, they can manage events FOR THAT club
        # AND events for any of its sub-clubs
        if request.user.club:
            # Check if the event belongs to the main club
            if obj.club.id == request.user.club.id:
                return True
            # Check if the event's club is a sub-club of the user's club
            if obj.club.parent and obj.club.parent.id == request.user.club.id:
                return True
            
        return False
