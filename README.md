# CampusCalendar - College Event Management System

A full-stack web application for managing college club events with real-time calendar views, role-based access control, and intelligent email notifications.

## 🚀 Features

- **User Authentication**: JWT-based login/signup with email verification
- **Interactive Calendar**: Monthly, weekly, and daily views using FullCalendar
- **Event Management**: Create, edit, and delete events with datetime and location support
- **Role-Based Permissions**: Users can be assigned to main clubs, sub-clubs, and additional clubs.
- **Club Hierarchy**: Create, edit, search, and drag-and-drop club hierarchies from the Admin Dashboard.
- **Smart Notifications**: Timezone and format-aware (12h/24h) email notifications for new, updated, and cancelled events.
- **Audit Logging**: Comprehensive activity tracking for event and user access changes.
- **Email Digest**: Beautiful HTML emails with event tables showing creators and recent updaters.
- **Overlapping Events**: Support for multiple events at the same time in different locations

## 🛠️ Technology Stack

### Backend
- Django 5.0
- Django REST Framework
- SimpleJWT for authentication
- PostgreSQL database
- Celery + Redis for task scheduling
- SMTP email with MailHog (development)

### Frontend
- React 18
- Vite
- TailwindCSS
- FullCalendar
- React Router
- Axios
- React DatePicker

### Deployment
- Docker & Docker Compose
- 6 services: Frontend, Backend, PostgreSQL, Redis, Celery, MailHog

## 📦 Installation

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/CEAL-Calender.git
   cd CEAL-Calender
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Seed the database with clubs**
   ```bash
   docker-compose exec backend python seed_data.py
   ```

5. **Access the application**
   - Frontend: http://localhost:3100
   - Backend API: http://localhost:8100
   - Django Admin: http://localhost:8100/admin (admin/admin123)
   - MailHog UI: http://localhost:8026

### Local Development

#### Backend Setup

1. **Install Python dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up PostgreSQL database**
   ```bash
   createdb ceal_calendar
   ```

3. **Run migrations**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Seed clubs**
   ```bash
   python seed_data.py
   ```

5. **Start Redis (for Celery)**
   ```bash
   redis-server
   ```

6. **Start Django server**
   ```bash
   python manage.py runserver
   ```

7. **Start Celery worker** (in new terminal)
   ```bash
   celery -A ceal_calendar worker --loglevel=info
   ```

8. **Start Celery beat** (in new terminal)
   ```bash
   celery -A ceal_calendar beat --loglevel=info
   ```

#### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signup/` - User registration
- `POST /api/auth/login/` - Login (returns JWT tokens)
- `POST /api/auth/token/refresh/` - Refresh access token
- `GET /api/auth/me/` - Get current user profile
- `PUT /api/auth/me/` - Update user profile/settings
- `POST /api/auth/change-password/` - Change password
- `POST /api/auth/logout/` - Logout (blacklist token)

### Clubs
- `GET /api/clubs/` - List all clubs (public)

### Events
- `GET /api/events/?start=YYYY-MM-DD&end=YYYY-MM-DD&clubs=1,2,3` - List events
- `POST /api/events/` - Create event (club auto-filled)
- `PUT /api/events/{id}/` - Update event (requires club membership)
- `DELETE /api/events/{id}/` - Delete event (requires club membership)

## 🎯 User Roles & Permissions

- **Guests**: View-only access to events
- **Super Admins**: Global access to manage users, assign roles, and modify club hierarchies with full search capabilities.
- **Club Members**: 
  - Create events for their assigned main club, sub-club, or extra clubs
  - Edit/delete ANY event in their assigned clubs (and sub-clubs)
  - Cannot modify events from unauthorized clubs

## 📧 Notification System

### How It Works

1. Users can enable/disable email notifications in settings
2. Set notification time (e.g., 9:00 AM) in their timezone
3. Celery Beat runs every minute to check notification times
4. Emails are sent ONLY if:
   - User has notifications enabled
   - Current time matches notification time (in their local timezone)
   - NEW, UPDATED, or CANCELLED events exist in the 24h window for their clubs.

### Email Template

- Professional HTML design with gradients
- Event tables with Title, Date/Time, Location, Description, and Author
- Highlights for updated and cancelled events
- Opt-out instructions
- Links to calendar and settings

## 🗂️ Database Models

### User
```python
- email (unique)
- club (ForeignKey to Club - Main Club)
- sub_club (ForeignKey to Club)
- extra_clubs (ManyToManyField to Club)
- notification_enabled (Boolean)
- notification_time (Time)
- timezone (CharField)
- time_format (CharField - 12h/24h)
- last_notification_sent_at (DateTime)
```

### Club
```python
- slug (unique)
- name
- color (hex color for calendar)
- parent (ForeignKey to Club for sub-clubs)
- order (Integer for drag-and-drop sorting)
```

### Event
```python
- title
- description
- start (DateTime)
- end (DateTime)
- location
- club (ForeignKey)
- created_by (ForeignKey to User)
- updated_by (ForeignKey to User)
- collaborating_clubs (ManyToManyField)
```

### Logs
```python
- ActivityLog: Tracks actor, action (CREATE/UPDATE/DELETE), entity, and details payload
- DeletedEventLog: Tracks future cancelled events to notify users
```

## 🎨 Theme & Design

- **Colors**: Primary gradient (purple-blue), vibrant club colors
- **UI**: Modern, clean design with TailwindCSS
- **Calendar**: FullCalendar with custom event rendering
- **Responsive**: Mobile-friendly layouts

## 📝 Seeded Clubs

The application comes pre-seeded with:

**IEEE Clubs**: Computer Society, EMBS, IAS, PES, PELS, RAS, SPS, WIE

**FOSS Clubs**: CREATE101, EMBED202, TRAIN303, HACK404, DEPLOY505

**IEDC**: EDC, Impact Cafe

**Others**: ISTE, TinkerHub, Yavanika, NSS, Sports Club

## 🧪 Testing Notifications

1. Set your notification time to 1 minute from now
2. Create a new event
3. Wait for the notification time
4. Check MailHog (http://localhost:8025) for the email
5. Verify subsequent runs don't send email (no new events)

## 🔧 Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key
DEBUG=True
POSTGRES_DB=ceal_calendar
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
REDIS_URL=redis://localhost:6380/0
EMAIL_HOST=localhost
EMAIL_PORT=1026
FRONTEND_URL=http://localhost:3100
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8100
```

## 🐳 Docker Services

1. **postgres** - PostgreSQL 15 database
2. **redis** - Redis for Celery broker
3. **backend** - Django application (Gunicorn)
4. **celery** - Celery worker for async tasks
5. **celery-beat** - Celery scheduler
6. **mailhog** - Email testing tool (SMTP + Web UI)
7. **frontend** - React + Vite development server

## 📄 License

MIT License - feel free to use this project for your college!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter issues, please open an issue on GitHub.

---

**Built with ❤️ for college clubs**
