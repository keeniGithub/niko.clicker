import { useState, useEffect, useRef } from 'react';

function App() {
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isEating, setIsEating] = useState(false);
  const [isDraggingFood, setIsDraggingFood] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const eatingSoundRef = useRef(null);
  const clickSoundRef = useRef(null);
  const userWsRef = useRef(null);
  const leaderboardWsRef = useRef(null);

  useEffect(() => {
    eatingSoundRef.current = new Audio('/sound/eating.mp3');
    clickSoundRef.current = new Audio('/sound/omori-meow.mp3');
    
    eatingSoundRef.current.load();
    clickSoundRef.current.load();

    const savedUsername = localStorage.getItem('clickerGameUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsAuthenticated(true);
      fetchUserData(savedUsername);
    }

    return () => {
      if (eatingSoundRef.current) {
        eatingSoundRef.current.pause();
        eatingSoundRef.current = null;
      }
      if (clickSoundRef.current) {
        clickSoundRef.current.pause();
        clickSoundRef.current = null;
      }
      if (userWsRef.current) {
        userWsRef.current.close();
      }
      if (leaderboardWsRef.current) {
        leaderboardWsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    userWsRef.current = new WebSocket(`ws://${import.meta.env.VITE_API_DOMAIN}/ws/user/${username}`);
    
    userWsRef.current.onopen = () => {
      console.log('User WebSocket connected');
    };

    userWsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'score_update') {
        setScore(data.data.new_score);
        setPosition(data.data.position);
      }
    };

    userWsRef.current.onclose = () => {
      console.log('User WebSocket disconnected');
    };

    leaderboardWsRef.current = new WebSocket(`ws://${import.meta.env.VITE_API_DOMAIN}/ws/leaderboard`);
    
    leaderboardWsRef.current.onopen = () => {
      console.log('Leaderboard WebSocket connected');
    };

    leaderboardWsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'leaderboard_update') {
        setLeaderboard(data.data);
      }
    };

    leaderboardWsRef.current.onclose = () => {
      console.log('Leaderboard WebSocket disconnected');
    };

    return () => {
      if (userWsRef.current) {
        userWsRef.current.close();
      }
      if (leaderboardWsRef.current) {
        leaderboardWsRef.current.close();
      }
    };
  }, [isAuthenticated, username]);

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    const validChars = /^[a-zA-Zа-яА-Я0-9_-]*$/;
    
    if (validChars.test(value)) {
      setUsername(value);
      setUsernameError('');
    } else {
      setUsernameError('Можно использовать только буквы (A-Z, А-Я), цифры (0-9), _ и -');
    }
  };

  const validateUsername = () => {
    if (username.length < 3) {
      setUsernameError('Никнейм должен быть не менее 3 символов');
      return false;
    }
    
    if (username.length > 12) {
      setUsernameError('Никнейм должен быть не более 12 символов');
      return false;
    }
    
    const validFormat = /^[a-zA-Zа-яА-Я0-9_-]+$/;
    if (!validFormat.test(username)) {
      setUsernameError('Недопустимые символы в никнейме');
      return false;
    }
    
    setUsernameError('');
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateUsername()) return;
    
    try {
      const response = await fetch(`http://${import.meta.env.VITE_API_DOMAIN}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, score: 0 }),
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('clickerGameUsername', username);
      } else {
        const error = await response.json();
        setUsernameError(error.detail || 'Ошибка регистрации');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setUsernameError('Ошибка соединения с сервером');
    }
  };

  const fetchUserData = async (usernameToFetch = username) => {
    try {
      const userResponse = await fetch(`http://${import.meta.env.VITE_API_DOMAIN}/user/${usernameToFetch}`);
      if (userResponse.status === 404) {
        localStorage.removeItem('clickerGameUsername');
        setIsAuthenticated(false);
        return;
      }
      const userData = await userResponse.json();
      setScore(userData.score);
      setPosition(userData.position);

      const lbResponse = await fetch(`http://${import.meta.env.VITE_API_DOMAIN}/leaderboard`);
      const lbData = await lbResponse.json();
      setLeaderboard(lbData);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleClick = async (isDrag = false) => {
    if (!isAuthenticated) return;
    
    if (isDrag) {
      setIsEating(true);
      try {
        eatingSoundRef.current.currentTime = 0;
        await eatingSoundRef.current.play();
      } catch (err) {
        console.log("Audio play error:", err);
      }
      setTimeout(() => setIsEating(false), 500);
    } else {
      setIsSmiling(true);
      try {
        clickSoundRef.current.currentTime = 0;
        await clickSoundRef.current.play();
      } catch (err) {
        console.log("Audio play error:", err);
      }
      setTimeout(() => setIsSmiling(false), 500);
    }
    
    try {
      const response = await fetch(`http://${import.meta.env.VITE_API_DOMAIN}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, is_drag: isDrag }),
      });
      
      if (!response.ok) {
        throw new Error('Click failed');
      }
    } catch (err) {
      console.error('Click error:', err);
    }
  };

  const handleDragStart = (e) => {
    if (!isAuthenticated) return;
    e.dataTransfer.setData('text/plain', 'feed');
    setIsDraggingFood(true);
    setIsSmiling(true);
  };

  const handleDragEnd = () => {
    setIsDraggingFood(false);
    setIsSmiling(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleClick(true);
    setIsDraggingFood(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getNikoImage = () => {
    if (isEating) return "url('/niko_pancakes.png')";
    if (isSmiling) return "url('/niko_smile.png')";
    if (isDraggingFood) return "url('/niko_smile.png')";
    return "url('/niko.png')";
  };

  const displayUsers = isLeaderboardOpen 
    ? leaderboard 
    : [...leaderboard.slice(0, 3), leaderboard.find(u => u.username === username)].filter(Boolean);

  return (
    <div className="game-container">
      {!isAuthenticated && (
        <div className="modal-overlay">
          <div className="auth-modal">
            <h1 className='auth-logo'><img src="niko.png" alt="" />Niko Clicker</h1>
            <form onSubmit={handleRegister}>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Введите ваш ник (3-12 символов)"
                required
                minLength={3}
                maxLength={12}
              />
              {usernameError && (
                <div className="error-message">
                  {usernameError}
                </div>
              )}
              <button type="submit">Кормить панкейками</button>
            </form>
          </div>
        </div>
      )}

      <>
        <div className={`leaderboard-panel ${isLeaderboardOpen ? 'open' : ''}`}>
          <div 
            className="leaderboard-header"
            onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
          >
            <span>Лидерборд</span>
            <span className="toggle-icon">{isLeaderboardOpen ? '▲' : '▼'}</span>
          </div>
          
          <div className="leaderboard-content">
            {displayUsers.map((user, index) => (
              <div 
                key={`${user.username}-${index}`}
                className={`leaderboard-entry ${user.username === username ? 'current-user' : ''}`}
              >
                <span className="leaderboard-position">
                  {!isLeaderboardOpen && index === 3 ? position : user.position || index + 1}.
                </span>
                <span className="leaderboard-username">{user.username}:</span>
                <span className="leaderboard-score">{user.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="game-area">
          <div className="user-panel">
            <span className="username">{username}</span>
          </div>
          <div className="score">Очки: {score}</div>
          
          <div 
            className={`click-target ${isEating ? 'eating' : ''}`}
            onClick={() => handleClick(false)}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              backgroundImage: getNikoImage()
            }}
          ></div>

          <div 
            className="drag-item"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{ backgroundImage: "url('/pancake.png')" }}
          ></div>
        </div>
      </>
    </div>
  );
}

export default App;