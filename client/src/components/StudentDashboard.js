import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSocket } from '../context/SocketContext';
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

const NameForm = styled.form`
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
  
  &:hover {
    background-color: #5f4dd0;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const LogoutButton = styled(Button)`
  background-color: #ff4757;
  
  &:hover {
    background-color: #ff6b81;
  }
`;

const PollContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const OptionButton = styled.button`
  width: 100%;
  padding: 15px;
  margin: 10px 0;
  border: 2px solid #6c5ce7;
  border-radius: 4px;
  background-color: ${props => props.selected ? '#6c5ce7' : 'white'};
  color: ${props => props.selected ? 'white' : '#6c5ce7'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.selected ? '#5f4dd0' : '#f0f0f0'};
  }

  &:disabled {
    border-color: #ccc;
    background-color: ${props => props.selected ? '#ccc' : '#f5f5f5'};
    color: ${props => props.selected ? 'white' : '#999'};
    cursor: not-allowed;
  }
`;

const Timer = styled.div`
  text-align: center;
  font-size: 1.2em;
  margin: 10px 0;
  color: ${props => props.timeLeft <= 10 ? '#ff4757' : '#333'};
`;

const ResultsContainer = styled.div`
  margin-top: 20px;
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

const ErrorMessage = styled.div`
  color: #ff4757;
  background-color: #ffe0e3;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
`;

const StudentDashboard = () => {
  const { socket, connected, emit } = useSocket();
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem('studentName') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [results, setResults] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);

  // Handle name input changes
  const handleNameChange = (e) => {
    const newName = e.target.value;
    // Only update if the length is within limits
    if (newName.length <= 30) {
      setName(newName);
      setError(''); // Clear any previous errors
    }
  };

  useEffect(() => {
    let connectionTimeout;

    if (!connected) {
      setIsConnecting(true);
      connectionTimeout = setTimeout(() => {
        setError('Still trying to connect to server. You can continue typing your name while we establish the connection.');
        setIsConnecting(false);
      }, 15000);
    } else {
      setIsConnecting(false);
      setError('');
      // Only attempt to rejoin if we have both a name and aren't joined
      if (name && !isJoined && sessionStorage.getItem('studentName')) {
        console.log('Attempting to rejoin with stored name:', name);
        emit('student_join', { name });
      }
    }

    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connected, emit, name, isJoined]);

  useEffect(() => {
    if (!socket) return;

    socket.on('joined_success', (data) => {
      console.log('Successfully joined:', data);
      setIsJoined(true);
      sessionStorage.setItem('studentName', name);
      sessionStorage.setItem('userRole', 'student');
      setError('');
    });

    socket.on('poll_created', (poll) => {
      console.log('Received new poll:', poll);
      setCurrentPoll(poll);
      setSelectedOption(null);
      setHasAnswered(false);
      setTimeLeft(poll.timeLimit);
      setError('');
    });

    socket.on('poll_updated', (data) => {
      console.log('Poll results updated:', data);
      setResults(data.results);
    });

    socket.on('poll_ended', () => {
      console.log('Poll ended');
      setCurrentPoll(null);
      setSelectedOption(null);
      setHasAnswered(false);
      setTimeLeft(null);
    });

    socket.on('kicked', () => {
      console.log('Kicked from session');
      sessionStorage.removeItem('studentName');
      sessionStorage.removeItem('userRole');
      setIsJoined(false);
      setName('');
      navigate('/');
    });

    socket.on('error', ({ message }) => {
      console.error('Server error:', message);
      setError(message);
    });

    return () => {
      socket.off('joined_success');
      socket.off('poll_created');
      socket.off('poll_updated');
      socket.off('poll_ended');
      socket.off('kicked');
      socket.off('error');
    };
  }, [socket, name, navigate]);

  useEffect(() => {
    if (timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate name
    const trimmedName = name.trim();
    
    // Comprehensive name validation
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Name must be less than 30 characters');
      return;
    }

    console.log('Submitting name:', trimmedName);
    emit('student_join', { name: trimmedName });
  };

  const handleAnswerSubmit = (option) => {
    if (!hasAnswered && timeLeft > 0) {
      console.log('Submitting answer:', option);
      setSelectedOption(option);
      setHasAnswered(true);
      emit('submit_answer', {
        pollId: currentPoll.id,
        answer: option
      });
    }
  };

  const handleLogout = () => {
    console.log('Logging out');
    // Don't disconnect socket, just clean up student data
    sessionStorage.removeItem('studentName');
    sessionStorage.removeItem('userRole');
    setIsJoined(false);
    setName('');
    navigate('/');
  };

  const renderResults = () => {
    if (!currentPoll) return null;

    const totalVotes = Object.keys(results).length;
    const voteCounts = {};
    Object.values(results).forEach(({ answer }) => {
      voteCounts[answer] = (voteCounts[answer] || 0) + 1;
    });

    return currentPoll.options.map((option) => {
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

  // Render name input form
  const renderNameForm = () => (
    <NameForm onSubmit={handleNameSubmit}>
      <Title>Enter Your Name</Title>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={handleNameChange}
        maxLength={30}
        autoFocus
      />
      <Button 
        type="submit" 
        disabled={!connected || !name.trim()}
      >
        {connected ? 'Join' : 'Connecting...'}
      </Button>
      <LogoutButton onClick={() => navigate('/')}>Back to Role Selection</LogoutButton>
    </NameForm>
  );

  // Show name form if not joined
  if (!isJoined) {
    return (
      <Container>
        {renderNameForm()}
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Welcome, {name}!</Title>
        <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {currentPoll ? (
        <PollContainer>
          <h2>{currentPoll.question}</h2>
          
          {timeLeft !== null && (
            <Timer timeLeft={timeLeft}>
              Time remaining: {timeLeft} seconds
            </Timer>
          )}

          {!hasAnswered && timeLeft > 0 ? (
            <div>
              <h3>Choose your answer:</h3>
              {currentPoll.options.map((option) => (
                <OptionButton
                  key={option}
                  onClick={() => handleAnswerSubmit(option)}
                  selected={selectedOption === option}
                  disabled={hasAnswered || timeLeft === 0}
                >
                  {option}
                </OptionButton>
              ))}
            </div>
          ) : (
            <ResultsContainer>
              <h3>Live Results</h3>
              {renderResults()}
              {hasAnswered && <p>Your answer: {selectedOption}</p>}
            </ResultsContainer>
          )}
        </PollContainer>
      ) : (
        <PollContainer>
          <h2>Waiting for teacher to start a poll...</h2>
        </PollContainer>
      )}
    </Container>
  );
};

export default StudentDashboard; 