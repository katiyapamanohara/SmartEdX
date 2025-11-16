export const servicesConfig = {
  courseService: {
    url: process.env.COURSE_SERVICE_URL || 'http://localhost:3002',
    prefix: '/api/courses',
  },
  quizService: {
    url: process.env.QUIZ_SERVICE_URL || 'http://localhost:3003',
    prefix: '/api/quizzes',
  },
};
