# Code Sync Backend

## Overview

The Code Sync backend is a collaborative real-time coding platform that allows multiple users to work on the same code simultaneously. It supports multiple programming languages (C, C++, Python, Java) with real-time code execution using Docker and WebSockets for live collaboration.

## Features

- User authentication (JWT-based)
- Session management for collaborative coding
- Real-time code synchronization using WebSockets
- Multi-language code execution (C, C++, Python, Java) with Docker
- Live cursors for different users with unique colors and names

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Real-time:** Socket.io
- **Code Execution:** Docker
- **Authentication:** JWT (JSON Web Tokens)

## Installation

### Prerequisites

- Node.js (v16+)
- MongoDB
- Docker

### Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/code-sync-backend.git
   cd code-sync-backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables (`.env` file):
   ```sh
   MONGO_URI=mongodb://localhost:27017/codesync
   JWT_SECRET=your_secret_key
   FRONTEND_URL=http://localhost:5173
   ```
4. Start the server:
   ```sh
   npm start
   ```

## API Endpoints

### Authentication

- **POST** `/auth/signup` - User registration
- **POST** `/auth/login` - User login

### Session Management

- **POST** `/session/create` - Create a new coding session
- **GET** `/session/:id` - Get session details

### Code Execution

- **POST** `/run-c` - Run C code
- **POST** `/run-cpp` - Run C++ code
- **POST** `/run-python` - Run Python code
- **POST** `/run-java` - Run Java code

## WebSocket Events

- `joinSession` - Join a coding session
- `code` - Sync code changes in real-time
- `cursorMove` - Broadcast live cursor movement
- `disconnect` - Handle user disconnection

## Running with Docker

1. Build the Docker container:
   ```sh
   docker build -t code-sync-backend .
   ```
2. Run the container:
   ```sh
   docker run -p 3000:3000 --rm code-sync-backend
   ```

## Deployment

1. Deploy backend to cloud (e.g., AWS, Heroku, DigitalOcean)
2. Set environment variables in production
3. Use a domain with HTTPS for secure WebSocket connections

## License

This project is open-source and available under the MIT License.
