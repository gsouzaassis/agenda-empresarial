# Business Appointment Management System

## Overview

This is a business appointment management system built with React, TypeScript, and Zustand for state management. The application allows businesses to manage appointments, clients, services, staff, and generate reports and receipts. It features a calendar interface for scheduling, client management capabilities, and comprehensive reporting tools.

The system is designed as a client-side application with local storage persistence, making it suitable for small businesses that need a simple, offline-capable appointment management solution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **State Management**: Zustand with persistence middleware for client-side state management and localStorage integration
- **UI Framework**: Custom component library built on Radix UI primitives with Tailwind CSS for styling
- **Component Structure**: Modular component architecture with separate directories for UI components, pages, and business logic

### Backend Architecture
- **Server Framework**: Express.js with TypeScript for API development
- **Architecture Pattern**: RESTful API design with route-based organization
- **Database Layer**: Drizzle ORM configured for PostgreSQL with schema-first approach
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development and database implementation for production
- **Development Setup**: Vite integration for hot module replacement in development

### Data Storage Solutions
- **Primary Database**: PostgreSQL using Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema Management**: Centralized schema definitions in shared directory for both client and server
- **Local Storage**: Browser localStorage for client-side data persistence in development mode
- **Migration System**: Drizzle Kit for database schema migrations and version control

### Authentication and Authorization
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage
- **User Management**: Basic user model with username-based identification
- **Security**: Express session middleware with PostgreSQL session store

### External Dependencies
- **UI Components**: Comprehensive Radix UI component library including dialogs, dropdowns, calendars, and form controls
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **Date Handling**: date-fns library for robust date manipulation and formatting
- **Form Management**: React Hook Form with Zod resolvers for type-safe form validation
- **State Management**: Zustand for lightweight, React-friendly state management
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Development Tools**: Replit-specific plugins for error handling and development experience

### Key Design Patterns
- **Component Composition**: Extensive use of Radix UI primitives for accessible, composable UI components
- **Type Safety**: Full TypeScript coverage with shared type definitions between client and server
- **State Persistence**: Zustand persistence middleware for maintaining application state across browser sessions
- **Modular Architecture**: Clear separation between client, server, and shared code with path aliases for clean imports
- **Configuration Management**: Environment-based configuration with development and production builds