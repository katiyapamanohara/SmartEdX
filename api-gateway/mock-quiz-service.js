#!/usr/bin/env node

/**
 * Mock Quiz Microservice for Testing
 * 
 * This is a simple Express server that simulates a quiz microservice
 * for testing the API Gateway integration.
 * 
 * Usage:
 *   node mock-quiz-service.js
 * 
 * The service will run on port 4001 by default.
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  console.log('Headers:', {
    'x-correlation-id': req.headers['x-correlation-id'],
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-gateway-service': req.headers['x-gateway-service'],
    'x-user-id': req.headers['x-user-id'],
    'x-user-email': req.headers['x-user-email'],
    'x-user-role': req.headers['x-user-role'],
    'x-user-name': req.headers['x-user-name'],
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'quiz-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mock quiz data
const quizzes = [
  {
    id: 1,
    title: 'JavaScript Basics',
    description: 'Test your JavaScript knowledge',
    questions: 10,
    difficulty: 'easy',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Advanced TypeScript',
    description: 'Deep dive into TypeScript features',
    questions: 15,
    difficulty: 'hard',
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 3,
    title: 'React Fundamentals',
    description: 'Learn React concepts',
    questions: 12,
    difficulty: 'medium',
    createdAt: '2025-01-03T00:00:00Z',
  },
];

// Get all quizzes
app.get('/quizzes', (req, res) => {
  // Extract user info from headers (provided by gateway)
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  const userName = req.headers['x-user-name'];
  
  console.log(`User ${userId} (${userEmail}) is fetching quizzes`);
  
  // Simulate processing delay
  setTimeout(() => {
    res.json({
      data: quizzes,
      total: quizzes.length,
      page: 1,
      limit: 10,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
      },
    });
  }, 100);
});

// Get quiz by ID
app.get('/quizzes/:id', (req, res) => {
  const quiz = quizzes.find((q) => q.id === parseInt(req.params.id));
  
  if (!quiz) {
    return res.status(404).json({
      error: 'Quiz not found',
      id: req.params.id,
    });
  }
  
  setTimeout(() => {
    res.json(quiz);
  }, 50);
});

// Create quiz
app.post('/quizzes', (req, res) => {
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  
  const newQuiz = {
    id: quizzes.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    createdBy: {
      id: userId,
      email: userEmail,
    },
  };
  
  quizzes.push(newQuiz);
  
  console.log(`User ${userId} created quiz: ${newQuiz.title}`);
  
  res.status(201).json(newQuiz);
});

// Update quiz
app.put('/quizzes/:id', (req, res) => {
  const index = quizzes.findIndex((q) => q.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({
      error: 'Quiz not found',
      id: req.params.id,
    });
  }
  
  quizzes[index] = {
    ...quizzes[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  
  res.json(quizzes[index]);
});

// Delete quiz
app.delete('/quizzes/:id', (req, res) => {
  const index = quizzes.findIndex((q) => q.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({
      error: 'Quiz not found',
      id: req.params.id,
    });
  }
  
  quizzes.splice(index, 1);
  res.status(204).send();
});

// Questions endpoints
app.get('/quizzes/:id/questions', (req, res) => {
  res.json({
    quizId: req.params.id,
    questions: [
      {
        id: 1,
        question: 'What is JavaScript?',
        type: 'multiple-choice',
        options: ['A programming language', 'A coffee brand', 'A car', 'A planet'],
        correctAnswer: 0,
      },
      {
        id: 2,
        question: 'What does HTML stand for?',
        type: 'multiple-choice',
        options: [
          'Hyper Text Markup Language',
          'Hot Mail',
          'How To Make Lasagna',
          'Home Tool Markup Language',
        ],
        correctAnswer: 0,
      },
    ],
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log(`🎯 Mock Quiz Service`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log('========================================');
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET    /health`);
  console.log(`  GET    /quizzes`);
  console.log(`  GET    /quizzes/:id`);
  console.log(`  POST   /quizzes`);
  console.log(`  PUT    /quizzes/:id`);
  console.log(`  DELETE /quizzes/:id`);
  console.log(`  GET    /quizzes/:id/questions`);
  console.log('');
  console.log('Test via API Gateway:');
  console.log(`  curl http://localhost:3000/quiz/quizzes`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
