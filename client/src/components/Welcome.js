import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f8f9fa;
`;

const Title = styled.h1`
  color: #333;
  text-align: center;
  margin-bottom: 30px;
`;

const Subtitle = styled.p`
  color: #666;
  text-align: center;
  margin-bottom: 40px;
  font-size: 1.2em;
`;

const RoleContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
`;

const RoleButton = styled.button`
  padding: 15px 30px;
  border: 2px solid #6c5ce7;
  border-radius: 8px;
  background-color: ${props => props.selected ? '#6c5ce7' : 'transparent'};
  color: ${props => props.selected ? 'white' : '#6c5ce7'};
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.selected ? '#5f4dd0' : '#f0f0f0'};
  }
`;

const ContinueButton = styled.button`
  padding: 12px 40px;
  background-color: #6c5ce7;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #5f4dd0;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const Welcome = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleContinue = () => {
    if (selectedRole === 'student') {
      navigate('/student');
    } else if (selectedRole === 'teacher') {
      navigate('/teacher');
    }
  };

  return (
    <Container>
      <Title>Welcome to the Live Polling System</Title>
      <Subtitle>Choose your role to get started</Subtitle>
      
      <RoleContainer>
        <RoleButton
          selected={selectedRole === 'student'}
          onClick={() => setSelectedRole('student')}
        >
          I'm a Student
        </RoleButton>
        <RoleButton
          selected={selectedRole === 'teacher'}
          onClick={() => setSelectedRole('teacher')}
        >
          I'm a Teacher
        </RoleButton>
      </RoleContainer>

      <ContinueButton
        onClick={handleContinue}
        disabled={!selectedRole}
      >
        Continue
      </ContinueButton>
    </Container>
  );
};

export default Welcome; 