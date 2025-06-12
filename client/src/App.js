import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import Welcome from './components/Welcome';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { SocketProvider } from './context/SocketContext';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
`;

const NotFound = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  
  h1 {
    font-size: 2em;
    color: #333;
    margin-bottom: 20px;
  }
  
  p {
    color: #666;
    margin-bottom: 20px;
  }
  
  a {
    color: #6c5ce7;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

// Route protection component
const ProtectedRoute = ({ children, role }) => {
  const hasRole = sessionStorage.getItem('userRole') === role;
  const hasName = role === 'student' ? sessionStorage.getItem('studentName') : true;

  if (!hasRole || !hasName) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </Router>
  );
}

export default App;
