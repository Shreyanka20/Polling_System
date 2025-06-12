import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  color: #333;
`;

const PollForm = styled.form`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #6c5ce7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
  
  &:hover {
    background-color: #5f4dd0;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 10px 20px;
  background-color: ${props => props.active ? '#6c5ce7' : 'white'};
  color: ${props => props.active ? 'white' : '#6c5ce7'};
  border: 2px solid #6c5ce7;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
  
  &:hover {
    background-color: ${props => props.active ? '#5f4dd0' : '#f0f0f0'};
  }
`;

const ResultsContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const OptionBar = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
`;

const OptionLabel = styled.span`
  flex: 1;
`;

const OptionCount = styled.span`
  margin-left: 10px;
  color: #666;
`;

const ProgressBar = styled.div`
  flex: 2;
  height: 20px;
  background: #ddd;
  border-radius: 10px;
  overflow: hidden;
  
  div {
    height: 100%;
    background: #6c5ce7;
    width: ${props => props.percentage}%;
    transition: width 0.3s ease;
  }
`;

const StudentList = styled.div`
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
`;

const StudentItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #ddd;
  
  &:last-child {
    border-bottom: none;
  }
`;

const KickButton = styled.button`
  padding: 5px 10px;
  background-color: #ff4757;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #ff6b81;
  }
`;

const InfoMessage = styled.div`
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: ${props => props.type === 'error' ? '#ffe0e3' : '#e3e9ff'};
  color: ${props => props.type === 'error' ? '#ff4757' : '#6c5ce7'};
`;

const LogoutButton = styled(Button)`
  background-color: #ff4757;
  
  &:hover {
    background-color: #ff6b81;
  }
`;

const ErrorMessage = styled.div`
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: #ffe0e3;
  color: #ff4757;
`;

const TeacherDashboard = () => {
  const { socket, connected, emit } = useSocket();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [results, setResults] = useState({});
  const [timeLimit, setTimeLimit] = useState(60);
  const [activeTab, setActiveTab] = useState('create');
  const [pollHistory, setPollHistory] = useState([]);
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    let connectionTimeout;

    if (!connected) {
      setIsConnecting(true);
      // Increased timeout to 15 seconds and added a more informative message
      connectionTimeout = setTimeout(() => {
        setError('Still trying to connect to server. Please wait a moment...');
        setIsConnecting(false);
      }, 15000);
    } else {
      setIsConnecting(false);
      setError('');
      // Emit teacher_join when connected
      emit('teacher_join');
    }

    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connected, emit]);

  useEffect(() => {
    if (!socket) return;

    socket.on('poll_created', (poll) => {
      console.log('Poll created:', poll);
      setCurrentPoll(poll);
      setActiveTab('results');
      setResults({});
    });

    socket.on('poll_updated', (data) => {
      console.log('Poll updated:', data);
      setResults(data.results);
    });

    socket.on('poll_ended', () => {
      console.log('Poll ended');
      setCurrentPoll(null);
      setResults({});
      setActiveTab('create');
    });

    socket.on('student_joined', (data) => {
      console.log('Student joined:', data);
      setConnectedStudents(prev => [...prev, data]);
    });

    socket.on('student_left', (studentId) => {
      console.log('Student left:', studentId);
      setConnectedStudents(prev => prev.filter(s => s.id !== studentId));
    });

    socket.on('error', ({ message }) => {
      console.error('Server error:', message);
      setError(message);
    });

    return () => {
      socket.off('poll_created');
      socket.off('poll_updated');
      socket.off('poll_ended');
      socket.off('student_joined');
      socket.off('student_left');
      socket.off('error');
    };
  }, [socket]);

  useEffect(() => {
    fetchPollHistory();
  }, []);

  const fetchPollHistory = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/polls/history`);
      setPollHistory(response.data);
    } catch (error) {
      console.error('Error fetching poll history:', error);
    }
  };

  const canCreateNewPoll = () => {
    if (!currentPoll) return true;
    
    // Check if all connected students have answered
    const answeredStudents = Object.keys(results).length;
    return answeredStudents >= connectedStudents.length;
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    setError('');

    if (!canCreateNewPoll()) {
      setError('Cannot create new poll until all students have answered the current one');
      return;
    }

    const validOptions = options.filter(opt => opt.trim() !== '');
    if (question.trim() === '' || validOptions.length < 2) {
      setError('Please enter a question and at least 2 options');
      return;
    }

    const pollData = {
      question: question.trim(),
      options: validOptions,
      timeLimit: Math.max(10, Math.min(300, timeLimit)) // Ensure timeLimit is between 10 and 300 seconds
    };

    console.log('Creating poll:', pollData);
    emit('create_poll', pollData);
  };

  const handleKickStudent = (studentId) => {
    emit('kick_student', studentId);
    setConnectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleEndPoll = () => {
    if (currentPoll) {
      emit('end_poll', { pollId: currentPoll.id });
    }
  };

  const handleLogout = () => {
    if (socket) {
      // Don't disconnect socket, just remove role
      sessionStorage.removeItem('userRole');
      // Keep the socket connection alive for student login
      navigate('/');
    }
  };

  const renderPollResults = (poll, pollResults) => {
    const totalVotes = Object.keys(pollResults).length;
    const voteCounts = {};
    Object.values(pollResults).forEach(({ answer }) => {
      voteCounts[answer] = (voteCounts[answer] || 0) + 1;
    });

    return poll.options.map((option) => {
      const count = voteCounts[option] || 0;
      const percentage = totalVotes === 0 ? 0 : (count / totalVotes) * 100;
      
      return (
        <OptionBar key={option}>
          <OptionLabel>{option}</OptionLabel>
          <ProgressBar percentage={percentage}>
            <div />
          </ProgressBar>
          <OptionCount>{count} votes ({percentage.toFixed(1)}%)</OptionCount>
        </OptionBar>
      );
    });
  };

  if (isConnecting) {
    return (
      <Container>
        <PollForm>
          <Title>Preparing Teacher Dashboard</Title>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div>Setting up your polling session...</div>
          <LogoutButton onClick={() => navigate('/')}>Back to Role Selection</LogoutButton>
        </PollForm>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Teacher Dashboard</Title>
        <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
      </Header>

      <TabContainer>
        <Tab
          active={activeTab === 'create'}
          onClick={() => setActiveTab('create')}
          disabled={!canCreateNewPoll()}
        >
          Create Poll
        </Tab>
        <Tab
          active={activeTab === 'results'}
          onClick={() => setActiveTab('results')}
        >
          Current Poll
        </Tab>
      </TabContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!canCreateNewPoll() && (
        <InfoMessage>
          Waiting for all students to answer before creating a new poll...
        </InfoMessage>
      )}

      {activeTab === 'create' && !currentPoll && (
        <PollForm onSubmit={handleCreatePoll}>
          <Input
            type="text"
            placeholder="Enter your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((option, index) => (
            <Input
              key={index}
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[index] = e.target.value;
                setOptions(newOptions);
              }}
            />
          ))}
          <Input
            type="number"
            placeholder="Time limit in seconds"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            min="1"
          />
          <Button type="submit">Create Poll</Button>
        </PollForm>
      )}

      {activeTab === 'results' && currentPoll && (
        <ResultsContainer>
          <h2>{currentPoll.question}</h2>
          {renderPollResults(currentPoll, results)}
          
          <StudentList>
            <h3>Connected Students ({connectedStudents.length})</h3>
            {connectedStudents.map((student) => {
              const hasAnswered = Object.values(results).some(r => r.user?.name === student.name);
              return (
                <StudentItem key={student.id}>
                  <span>
                    {student.name} - {hasAnswered ? 'Answered' : 'Not answered yet'}
                  </span>
                  <KickButton onClick={() => handleKickStudent(student.id)}>
                    Kick
                  </KickButton>
                </StudentItem>
              );
            })}
          </StudentList>
          
          <Button onClick={handleEndPoll}>End Poll</Button>
        </ResultsContainer>
      )}
    </Container>
  );
};

export default TeacherDashboard; 