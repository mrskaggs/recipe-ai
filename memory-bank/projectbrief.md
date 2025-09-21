# Recipe AI - Full Stack Recipe Management Application

## Project Overview
Recipe AI is a comprehensive full-stack web application for managing, discovering, and sharing recipes. The application provides users with an intuitive interface to browse, search, and filter recipes, with advanced features like AI-powered recipe processing and print-friendly recipe cards.

## Core Objectives
- **Recipe Management**: Complete CRUD operations for recipes with rich metadata
- **User Experience**: Modern, responsive interface with fast search and filtering
- **AI Integration**: Automated recipe processing using n8n workflows
- **Production Ready**: Containerized deployment with security best practices
- **Scalability**: PostgreSQL database with proper indexing and relationships

## Key Features
- Recipe browsing with pagination and advanced filtering
- Full-text search across titles, ingredients, and instructions
- Tag-based categorization system
- Nutritional information tracking
- Print-friendly recipe cards
- AI-powered recipe text processing
- JWT-based authentication system
- Role-based access control (admin/user)
- RESTful API with OpenAPI documentation
- Docker containerization for easy deployment

## Technical Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL 15
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **Authentication**: JWT with bcrypt password hashing
- **AI Processing**: n8n webhook integration
- **Deployment**: Docker + Docker Compose + Nginx

## Success Criteria
- Fast, responsive user interface with <2s load times
- Comprehensive recipe database with rich metadata
- Reliable AI recipe processing with error handling
- Secure authentication and authorization
- Production deployment with monitoring and logging
- Clean, maintainable codebase following best practices
