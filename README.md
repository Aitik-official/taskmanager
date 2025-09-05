# Project Monitoring App

A comprehensive project management system designed for Directors, Project Heads, and Employees with role-based access control and unified dashboard experience.

## Features

### 🎯 Core Functionality
- **Unified Dashboard**: Single interface for all user roles
- **Role-Based Access Control**: Different permissions for Directors, Project Heads, and Employees
- **Task Management**: Create, assign, track, and manage tasks
- **Project Overview**: Monitor project progress and status
- **Performance Tracking**: Rating system and performance evaluation
- **Extension Requests**: Employees can request deadline extensions with valid reasons

### 👥 User Roles

#### Director
- View and edit any task
- Set priority levels and add comments
- Assign marks/ratings with performance comments
- Filter tasks by project, employee, priority, and status
- Generate performance reports
- Lock/unlock tasks to prevent employee modifications

#### Project Head
- Manage tasks within their projects
- Assign tasks to employees
- Monitor project progress
- Add comments and track task status

#### Employee
- View assigned tasks
- Update task progress
- Add completion comments
- Request deadline extensions when needed
- Cannot modify locked tasks

### 🎨 Design Features
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, professional interface with intuitive navigation
- **Real-time Updates**: Dynamic dashboard with live statistics
- **Interactive Elements**: Hover effects, smooth transitions, and visual feedback

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **State Management**: React Context API

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-monitoring-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   Create `.env` file with your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   PORT=5000
   ```

4. **Start the backend server**
   ```bash
   npm start
   ```
   The backend will run on `http://localhost:5000`

### Build for Production

```bash
npm run build
```

## Demo Credentials

### Director Access
- **Email**: director@company.com
- **Password**: password

### Project Head Access
- **Email**: projecthead@company.com
- **Password**: password

### Employee Access
- **Email**: employee@company.com
- **Password**: password

## Project Structure

```
├── src/                # Frontend React components
│   ├── components/     # React components
│   │   ├── Dashboard.tsx   # Main dashboard component
│   │   ├── Header.tsx      # Application header
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── Login.tsx       # Authentication component
│   │   ├── StatsCards.tsx  # Dashboard statistics
│   │   ├── TaskList.tsx    # Task display component
│   │   ├── TaskModal.tsx   # Task creation/editing modal
│   │   └── ProjectOverview.tsx # Project summary component
│   ├── contexts/       # React contexts
│   │   └── AuthContext.tsx # Authentication context
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Main type definitions
│   ├── data/           # Mock data
│   │   └── mockData.ts     # Sample projects and tasks
│   ├── App.tsx         # Main application component
│   └── index.tsx       # Application entry point
├── backend/            # Backend Node.js server
│   ├── server.js       # Main Express server
│   ├── package.json    # Backend dependencies
│   ├── seed*.js        # Database seeding scripts
│   ├── test*.js        # API testing scripts
│   └── README.md       # Backend documentation
├── public/             # Static assets
└── package.json        # Frontend dependencies
```

## Key Features Implementation

### Task Locking System
- Directors can lock tasks to prevent employee modifications
- Locked tasks show visual indicators
- Employees cannot edit locked tasks

### Extension Request Workflow
- Employees can request deadline extensions for overdue tasks
- Must provide valid reasons and new proposed deadlines
- Extension requests are tracked and visible to management

### Performance Rating System
- Directors can rate employee performance (1-5 scale)
- Rating comments provide detailed feedback
- Ratings are visible in task details

### Role-Based Filtering
- Each role sees only relevant tasks and projects
- Directors have access to all data
- Project Heads see their project data
- Employees see only their assigned tasks

## Customization

### Adding New User Roles
1. Update the `User` type in `src/types/index.ts`
2. Modify `AuthContext.tsx` to handle new roles
3. Update role-based logic in components

### Adding New Task Statuses
1. Update the `Task` interface in types
2. Modify status-related components and logic
3. Update mock data if needed

### Styling Changes
- Modify `tailwind.config.js` for theme customization
- Update component classes for visual changes
- Add custom CSS in component-specific files

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Built with ❤️ using React and TypeScript**
