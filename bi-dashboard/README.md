# BI Dashboard

A modern business intelligence dashboard built with React, Vite, and Tailwind CSS.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Development](#development)
  - [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Key Components](#key-components)
- [Routing](#routing)
- [Styling](#styling)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Project Overview

BI Dashboard is a comprehensive business intelligence application designed for data visualization, reporting, and user management. Built with modern web technologies, it provides a responsive and feature-rich interface for business analytics.

## Features

- User authentication system
- Interactive dashboard with data visualization
- Report creation and management
- User and access group management
- Drag-and-drop report design interface
- Responsive design for all device sizes
- Dark mode support
- Toast notifications
- Charting capabilities with Recharts

## Tech Stack

- **Framework**: React 18+ (Vite)
- **Build Tool**: Vite 6+
- **Styling**: Tailwind CSS 2.2.19
- **Routing**: React Router v7+
- **UI Components**: Heroicons, Lucide React
- **State Management**: React Hooks
- **Data Visualization**: Recharts
- **Drag and Drop**: React Beautiful DnD, @hello-pangea/dnd
- **Notifications**: React Toastify
- **HTTP Client**: Axios
- **Code Quality**: ESLint

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd bi-dashboard
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── controllers/         # Business logic controllers
├── data/               # Static data and mock APIs
├── pages/              # Page components
├── services/           # API services
├── App.jsx             # Main application component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Creates a production build
- `npm run build:css` - Builds Tailwind CSS
- `npm run lint` - Runs ESLint
- `npm run preview` - Previews the production build locally

## Key Components

- **Sidebar**: Navigation menu with collapsible functionality
- **Header**: Application header with mobile menu toggle
- **Dashboard**: Main dashboard with statistics and reports
- **ReportGroups**: Management of report groups
- **Users**: User management interface
- **Settings**: Application settings page
- **CreateReport**: Report creation interface
- **DesignReport**: Drag-and-drop report designer
- **ViewReportPage**: Report viewing interface

## Routing

The application uses React Router for navigation:

- `/` - Login page
- `/dashboard` - Main dashboard
- `/reports` - Report viewing
- `/reports/create` - Report creation
- `/reports/design` - Report design
- `/report-groups` - Report group management
- `/users` - User management
- `/settings` - Application settings
- `/user/access` - Access group assignment
- `/view-report` - Report viewing
- `/profile` - User profile
- `/change-password` - Password change

## Styling

The application uses Tailwind CSS for styling with a custom configuration that includes:

- Extended color palette with primary, secondary, and accent colors
- Responsive design utilities
- Dark mode support
- Custom utility classes

## Deployment

To deploy the application:

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist/` directory contains all necessary files for deployment to any static hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is proprietary and confidential. All rights reserved.