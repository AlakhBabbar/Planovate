# Planovate - Timetable Management System

## Overview
Planovate is a comprehensive timetable management system designed to help educational institutions create and manage class schedules efficiently. Built with modern web technologies, it provides an intuitive interface for managing faculty assignments, course allocations, and room scheduling while automatically preventing conflicts.

## Tech Stack
- **Frontend**: React with Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **State Management**: React Hooks
- **Routing**: React Router

## Features

### Teacher Management
- Add, update, and delete teacher records
- Organize teachers by faculty and department
- Track teacher availability and assignments
- Prevent scheduling conflicts automatically

### Course Management
- Comprehensive course catalog management
- Credit system implementation
- Multiple teacher assignments per course
- Course scheduling by semester and department

### Room Management
- Room allocation with capacity tracking
- Time slot based availability management
- Conflict prevention for room bookings
- Room occupancy tracking

### Timetable Generation
- **Automated Schedule Creation**: Smart scheduling with conflict detection
- **Visual Timetable Interface**: Easy-to-use grid layout
- **Batch Management**: Support for split batches and parallel classes
- **Real-time Conflict Resolution**: Instant feedback on scheduling conflicts
- **Occupancy Statistics**: Live tracking of teacher and room availability

### System Features
- **Modular Architecture**: Clean separation of concerns for maintainability
- **RESTful APIs**: Well-structured backend services
- **Error Handling**: Comprehensive validation and error reporting
- **Responsive Design**: Works on desktop and tablet devices

## Project Structure
```
frontend/          # React + Vite frontend application
  ├── src/
  │   ├── components/  # Reusable UI components
  │   ├── pages/       # Main application views
  │   └── assets/      # Static resources
  
backend/           # Express.js backend server
  ├── routes/      # API route definitions
  ├── models/      # MongoDB schemas
  ├── methods/     # Business logic
  └── db/          # Database configuration
```

## Setup Instructions

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install
```
3. Start development server:
```bash
npm run dev
```

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```
2. Install dependencies:
```bash
npm install
```
3. Create a .env file with your MongoDB connection string:
```
mongo_url=your_mongodb_connection_string
```
4. Start the server:
```bash
node index.js
```

## Future Enhancements
- User authentication and authorization
- Credit-based class allotment system
- Advanced reporting and analytics
- Mobile application support
- Export functionality for schedules
- Automated schedule optimization

## Contributing
Contributions are welcome! Please feel free to submit pull requests or create issues for bugs and feature requests.

## License
This project is licensed under the ISC License.


