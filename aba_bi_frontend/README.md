# ABA BI Frontend

A modern business intelligence dashboard built with React, TypeScript, and Tailwind CSS.

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
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Project Overview

ABA BI Frontend is a comprehensive business intelligence dashboard application designed to provide data visualization, reporting, and analytics capabilities. The application features a responsive design with a clean, modern UI built using Tailwind CSS.

## Features

- User authentication and session management
- Interactive dashboard with data visualization
- Report generation and execution
- User profile management
- Settings configuration
- Responsive design for all device sizes
- Dark mode support
- Export capabilities (PDF, CSV)

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Create React App
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router v6+
- **UI Components**: Heroicons, Lucide React
- **Data Handling**: Axios, PapaParse
- **PDF Generation**: jsPDF, jsPDF-AutoTable
- **State Management**: React Hooks
- **Testing**: React Testing Library, Jest
- **Code Quality**: ESLint, Prettier

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
   cd aba_bi_frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Project Structure

```
src/
├── components/          # Reusable UI components
├── data/               # Static data and mock APIs
├── layouts/            # Page layouts
├── pages/              # Page components
├── routes/             # Routing configuration
├── services/           # API services
├── types/              # TypeScript types
├── App.tsx             # Main application component
├── index.tsx           # Entry point
└── index.css           # Global styles
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects the Create React App configuration

## Key Components

- **LoginForm**: User authentication form
- **ReportChart**: Data visualization component
- **ReportTable**: Data presentation in table format
- **Sidebar**: Navigation menu
- **Footer**: Application footer
- **MainLayout**: Main application layout wrapper

## Routing

The application uses React Router for navigation:

- `/` - Login page
- `/home` - Dashboard home
- `/report/:id` - Report execution page
- `/forgot-password` - Password recovery
- `/help` - Help and support
- `/settings` - User settings with nested routes:
  - `/settings/profile` - Profile management
  - `/settings/change-password` - Password change

## Styling

The application uses Tailwind CSS for styling with a custom configuration that includes:

- Extended color palette with primary, secondary, and accent colors
- Custom font sizes and spacing
- Additional utility classes for glass effects and gradients
- Responsive design utilities
- Dark mode support

## Testing

Run tests using:

```bash
npm test
```

The project uses React Testing Library with Jest for unit and integration testing.

## Deployment

The application can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages) by building the project and serving the `build/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is proprietary and confidential. All rights reserved.