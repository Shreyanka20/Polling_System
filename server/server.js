require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Poll = require('./models/Poll');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/polling-system')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// In-memory storage
const connectedUsers = new Map(); // socket.id -> user data
const activePoll = {
  data: null,  // Current poll data
  results: new Map(), // studentId -> answer
  timer: null
};

// API routes
app.get('/api/polls/history', async (req, res) => {
  try {
    const polls = await Poll.find({ isActive: false })
      .sort({ startTime: -1 })
      .limit(10);
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current poll state immediately on connection
  if (activePoll.data && activePoll.data.isActive) {
    console.log('Sending active poll to new connection:', activePoll.data);
    socket.emit('poll_created', activePoll.data);
    socket.emit('poll_updated', {
      pollId: activePoll.data.id,
      results: Object.fromEntries(activePoll.results)
    });
  }

  // Clean up function for both student and teacher disconnections
  const handleDisconnection = () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      if (user.role === 'teacher') {
        // Don't end poll when teacher disconnects, just remove from connected users
        connectedUsers.delete(socket.id);
      } else if (user.role === 'student') {
        // Notify teachers that a student has left
        io.emit('student_left', socket.id);
        connectedUsers.delete(socket.id);
      }
    }
  };

  // Handle both disconnect and disconnecting events
  socket.on('disconnect', handleDisconnection);
  socket.on('disconnecting', handleDisconnection);

  // Teacher creates a new poll
  socket.on('create_poll', (pollData) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.role !== 'teacher') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    // Validate poll data
    if (!pollData.question || typeof pollData.question !== 'string' || pollData.question.trim().length === 0) {
      socket.emit('error', { message: 'Invalid question' });
      return;
    }

    if (!Array.isArray(pollData.options) || pollData.options.length < 2) {
      socket.emit('error', { message: 'At least 2 options are required' });
      return;
    }

    const validOptions = pollData.options.filter(opt => 
      typeof opt === 'string' && opt.trim().length > 0
    );

    if (validOptions.length < 2) {
      socket.emit('error', { message: 'At least 2 valid options are required' });
      return;
    }

    // Clear any existing timer
    if (activePoll.timer) {
      clearTimeout(activePoll.timer);
    }

    // Set up new poll
    activePoll.data = {
      ...pollData,
      options: validOptions,
      id: Date.now().toString(),
      startTime: new Date(),
      isActive: true,
      timeLimit: Math.max(10, Math.min(300, pollData.timeLimit || 60)) // Default 60 seconds, min 10, max 300
    };
    activePoll.results = new Map();

    console.log('Creating new poll:', activePoll.data);

    // Broadcast to all clients
    io.emit('poll_created', activePoll.data);

    // Set timer to end poll
    activePoll.timer = setTimeout(() => {
      endPoll();
    }, activePoll.data.timeLimit * 1000);
  });

  // Student joins
  socket.on('student_join', ({ name }) => {
    // Validate name
    if (!name || typeof name !== 'string') {
      socket.emit('error', { message: 'Invalid name format' });
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      socket.emit('error', { message: 'Name must be between 2 and 30 characters' });
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      socket.emit('error', { message: 'Name can only contain letters, numbers, and spaces' });
      return;
    }

    // Check if name is already taken
    const isNameTaken = Array.from(connectedUsers.values())
      .some(user => user.role === 'student' && user.name === trimmedName);

    if (isNameTaken) {
      socket.emit('error', { message: 'Name already taken' });
      return;
    }

    const studentData = { id: socket.id, name: trimmedName, role: 'student' };
    connectedUsers.set(socket.id, studentData);
    
    console.log('Student joined:', studentData);

    socket.emit('joined_success', { id: socket.id, name: trimmedName });

    // Notify teachers of new student
    const teacherSockets = Array.from(connectedUsers.entries())
      .filter(([_, user]) => user.role === 'teacher')
      .map(([id]) => id);
    
    teacherSockets.forEach(teacherId => {
      io.to(teacherId).emit('student_joined', studentData);
    });

    // Send active poll to the newly joined student if exists
    if (activePoll.data && activePoll.data.isActive) {
      console.log('Sending active poll to new student:', activePoll.data);
      socket.emit('poll_created', activePoll.data);
      socket.emit('poll_updated', {
        pollId: activePoll.data.id,
        results: Object.fromEntries(activePoll.results)
      });
    }
  });

  // Teacher joins
  socket.on('teacher_join', () => {
    connectedUsers.set(socket.id, { id: socket.id, role: 'teacher' });
    socket.emit('joined_success', { id: socket.id, role: 'teacher' });

    // Send current students list to teacher
    const students = Array.from(connectedUsers.values())
      .filter(user => user.role === 'student');
    students.forEach(student => {
      socket.emit('student_joined', student);
    });

    // Send active poll to the newly joined teacher if exists
    if (activePoll.data && activePoll.data.isActive) {
      socket.emit('poll_created', activePoll.data);
      socket.emit('poll_updated', {
        pollId: activePoll.data.id,
        results: Object.fromEntries(activePoll.results)
      });
    }
  });

  // Submit answer
  socket.on('submit_answer', ({ pollId, answer }) => {
    if (!activePoll.data || !activePoll.data.isActive || activePoll.data.id !== pollId) {
      socket.emit('error', { message: 'No active poll or invalid poll ID' });
      return;
    }

    const user = connectedUsers.get(socket.id);
    if (!user || user.role !== 'student') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    // Save the answer
    activePoll.results.set(socket.id, { answer, user });

    console.log('Answer submitted:', { pollId, answer, user }); // Debug log

    // Broadcast updated results
    io.emit('poll_updated', {
      pollId,
      results: Object.fromEntries(activePoll.results)
    });
  });

  // End poll manually
  socket.on('end_poll', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.role === 'teacher') {
      endPoll();
    }
  });

  // Kick student
  socket.on('kick_student', (studentId) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.role === 'teacher') {
      io.to(studentId).emit('kicked');
      connectedUsers.delete(studentId);
      io.emit('student_left', studentId);
    }
  });
});

// Helper function to end a poll
function endPoll() {
  if (activePoll.data && activePoll.data.isActive) {
    activePoll.data.isActive = false;
    activePoll.data.endTime = new Date();

    console.log('Ending poll:', activePoll.data.id); // Debug log

    io.emit('poll_ended', { 
      pollId: activePoll.data.id,
      finalResults: Object.fromEntries(activePoll.results)
    });

    // Clear the timer if it exists
    if (activePoll.timer) {
      clearTimeout(activePoll.timer);
      activePoll.timer = null;
    }
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
