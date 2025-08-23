# Graphile Worker UI

A comprehensive web-based user interface for monitoring and managing [Graphile Worker](https://github.com/graphile/worker) job queues. Built with PostGraphile backend and React frontend, providing real-time job monitoring, management capabilities, and beautiful visualizations.

## Features

- **📊 Dashboard**: Real-time job statistics with charts and status overview
- **📋 Job Management**: View, search, filter, and manage jobs
- **🔄 Job Actions**: Retry failed jobs, cancel pending jobs, mark jobs as complete
- **📱 Real-time Updates**: Live job status updates via GraphQL subscriptions
- **🎨 Modern UI**: Clean, responsive interface built with Tailwind CSS
- **🐳 Docker Ready**: Complete containerization with Docker Compose

## Architecture

### Backend
- **PostGraphile**: Auto-generates GraphQL API from PostgreSQL schema
- **Node.js v22**: Latest LTS with native `--env-file` support
- **Custom Mutations**: Job management operations (retry, cancel, complete)
- **WebSocket Subscriptions**: Real-time job updates

### Frontend
- **React 18**: Modern React with hooks and concurrent features
- **Apollo Client**: GraphQL client with caching and subscriptions
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server
- **Recharts**: Beautiful charts for job statistics

## Quick Start

### Prerequisites
- Node.js v22+
- PostgreSQL with Graphile Worker schema
- Existing Graphile Worker setup

### Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd web/graphile-worker
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database connection details
   ```

3. **Start development servers:**
   ```bash
   ./start-dev.sh
   ```

4. **Access the application:**
   - Frontend: http://localhost:3001
   - GraphQL API: http://localhost:5001/graphql
   - GraphiQL: http://localhost:5001/graphiql

### Docker Deployment

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your production database details
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend: http://localhost:5001

## Configuration

### Environment Variables

All configuration is managed through a single `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL=postgres://postgres:password@localhost:5432/pet
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pet
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Backend Server Configuration
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Frontend Configuration
VITE_GRAPHQL_URL=http://localhost:5001/graphql
VITE_GRAPHQL_WS_URL=ws://localhost:5001/graphql
VITE_NODE_ENV=development

# Docker Compose Environment
COMPOSE_PROJECT_NAME=graphile-worker-ui
```

## Development

### Project Structure
```
web/graphile-worker/
├── backend/                 # PostGraphile backend
│   ├── index.js            # Main server file
│   ├── package.json        # Backend dependencies
│   └── Dockerfile          # Backend container
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # App entry point
│   ├── package.json        # Frontend dependencies
│   └── Dockerfile          # Frontend container
├── docker-compose.yml      # Container orchestration
├── start-dev.sh           # Development startup script
└── .env.example           # Environment template
```

### Key Components

- **Dashboard**: Job statistics, charts, and recent activity
- **JobList**: Searchable, filterable job listing with actions
- **JobDetails**: Detailed job information and management

### Available Scripts

#### Backend
```bash
cd backend
npm run dev    # Start with nodemon and --env-file
npm start      # Production start with --env-file
```

#### Frontend
```bash
cd frontend
npm run dev    # Vite development server
npm run build  # Production build
npm run preview # Preview production build
```

## API Reference

The backend exposes a GraphQL API with the following key operations:

### Queries
- `jobs`: List all jobs with filtering options
- `job(id: Int!)`: Get specific job details

### Mutations
- `retryJob(jobId: Int!)`: Retry a failed job
- `cancelJob(jobId: Int!)`: Cancel a pending job
- `completeJob(jobId: Int!)`: Mark job as complete

### Subscriptions
- `jobUpdated`: Real-time job status updates

## Production Deployment

### Docker Compose (Recommended)
```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# With custom environment
docker-compose --env-file .env.production up -d
```

### Manual Deployment
1. Build frontend: `cd frontend && npm run build`
2. Start backend: `cd backend && npm start`
3. Serve frontend build with nginx or similar

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure PostgreSQL is running and accessible
2. **GraphQL Errors**: Verify Graphile Worker schema exists in database
3. **Environment Variables**: Check `.env` file configuration
4. **Port Conflicts**: Ensure ports 3001 and 5001 are available

### Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Development logs
# Backend and frontend logs appear in terminal when using start-dev.sh
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the larger pet project and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Graphile Worker documentation
3. Open an issue in the project repository
