class MillionaireGame {
    constructor() {
        this.currentQuestion = 0;
        this.currentTopic = null;
        this.currentDifficulty = null;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        this.gameMode = 'individual'; // 'individual' or 'team'
        this.teams = [];
        this.currentTeamIndex = 0;
        this.teamStats = new Map(); // Store team scores and progress
        this.storageKey = 'wwtbdGame'; // Local storage key
        this.moneyLadder = [
            "1 Ramen Cup", 
            "1 Energy Drink", 
            "1 Pizza Slice", 
            "1 Coffee & Donut", 
            "1 Movie Ticket", 
            "1 Textbook (Used!)", 
            "1 Gaming Headset", 
            "1 Laptop Upgrade", 
            "1 Semester Parking Pass", 
            "1 MILLION DOLLARS!"
        ];
        this.questions = {};
        this.currentQuestions = [];
        this.audioEnabled = false;
        this.currentBackgroundMusic = null;
        this.initAudio();
        this.init();
    }

    initAudio() {
        this.sounds = {
            introMusic: new Audio('assets/sounds/intro-music.mp3'),
            questionTension: new Audio('assets/sounds/question-tension.mp3'),
            finalAnswerTension: new Audio('assets/sounds/final-answer-tension.mp3'),
            correctAnswer: new Audio('assets/sounds/correct-answer.mp3'),
            wrongAnswer: new Audio('assets/sounds/wrong-answer.mp3'),
            buttonHover: new Audio('assets/sounds/button-hover.mp3'),
            answerSelect: new Audio('assets/sounds/answer-select.mp3'),
            fiftyFifty: new Audio('assets/sounds/fifty-fifty.mp3'),
            askAudience: new Audio('assets/sounds/ask-audience.mp3'),
            phoneAFriend: new Audio('assets/sounds/phone-friend.mp3'),
            moneyWin: new Audio('assets/sounds/money-win.mp3'),
            jackpotWin: new Audio('assets/sounds/jackpot-win.mp3')
        };

        // Set volume levels
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.6;
            sound.preload = 'auto';
        });

        // Background music should loop and be quieter
        this.sounds.introMusic.loop = true;
        this.sounds.questionTension.loop = true;
        this.sounds.introMusic.volume = 0.3;
        this.sounds.questionTension.volume = 0.2;
    }

    playSound(soundName) {
        if (!this.audioEnabled) return;
        try {
            const sound = this.sounds[soundName];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log('Audio play failed:', e));
            }
        } catch (e) {
            console.log('Sound not found:', soundName);
        }
    }

    playBackgroundMusic(soundName) {
        if (!this.audioEnabled) return;
        try {
            // Stop current background music
            if (this.currentBackgroundMusic) {
                this.currentBackgroundMusic.pause();
                this.currentBackgroundMusic.currentTime = 0;
            }
            
            // Start new background music
            const sound = this.sounds[soundName];
            if (sound) {
                this.currentBackgroundMusic = sound;
                sound.currentTime = 0;
                sound.play().catch(e => console.log('Background music play failed:', e));
            }
        } catch (e) {
            console.log('Background music not found:', soundName);
        }
    }

    stopBackgroundMusic() {
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
            this.currentBackgroundMusic = null;
        }
    }

    // Local Storage Methods
    saveGameState() {
        try {
            const gameState = {
                currentQuestion: this.currentQuestion,
                currentTopic: this.currentTopic,
                currentDifficulty: this.currentDifficulty,
                gameOver: this.gameOver,
                usedLifelines: { ...this.usedLifelines },
                gameMode: this.gameMode,
                teams: [...this.teams],
                currentTeamIndex: this.currentTeamIndex,
                teamStats: Object.fromEntries(this.teamStats),
                currentQuestions: this.currentQuestions,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(gameState));
            console.log('Game state saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save game state:', error);
            return false;
        }
    }

    loadGameState() {
        try {
            const savedState = localStorage.getItem(this.storageKey);
            if (!savedState) return null;
            
            const gameState = JSON.parse(savedState);
            
            // Restore all game state properties
            this.currentQuestion = gameState.currentQuestion;
            this.currentTopic = gameState.currentTopic;
            this.currentDifficulty = gameState.currentDifficulty;
            this.gameOver = gameState.gameOver;
            this.usedLifelines = { ...gameState.usedLifelines };
            this.gameMode = gameState.gameMode;
            this.teams = [...gameState.teams];
            this.currentTeamIndex = gameState.currentTeamIndex;
            this.teamStats = new Map(Object.entries(gameState.teamStats));
            this.currentQuestions = gameState.currentQuestions;
            
            console.log('Game state loaded successfully');
            return gameState;
        } catch (error) {
            console.error('Failed to load game state:', error);
            return null;
        }
    }

    hasSavedGame() {
        try {
            const savedState = localStorage.getItem(this.storageKey);
            if (!savedState) return false;
            
            const gameState = JSON.parse(savedState);
            // Check if it's a valid game state with progress
            return gameState.currentQuestion > 0 || 
                   (gameState.gameMode === 'team' && gameState.teams.length > 0);
        } catch (error) {
            console.error('Error checking saved game:', error);
            return false;
        }
    }

    clearSavedGame() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('Saved game cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear saved game:', error);
            return false;
        }
    }

    deleteAllSavedData() {
        const confirmed = confirm('Are you sure you want to delete ALL saved game data? This action cannot be undone.');
        
        if (confirmed) {
            try {
                // Clear all localStorage data related to the game
                localStorage.clear();
                console.log('All saved data cleared');
                
                // Hide the continue game section since there's no saved data anymore
                document.getElementById('continue-game-section').classList.add('hidden');
                document.querySelector('.game-mode-selection').style.display = 'block';
                
                alert('All saved data has been deleted successfully!');
                return true;
            } catch (error) {
                console.error('Failed to clear all saved data:', error);
                alert('Error deleting saved data. Please try again.');
                return false;
            }
        }
        return false;
    }

    async initializeQuestions() {
        try {
            // Load quiz manifest
            const manifestResponse = await fetch('./quizzes/quizzes.json');
            const manifest = await manifestResponse.json();
            
            const questions = {};
            
            // Load each quiz file
            for (const quiz of manifest.available) {
                try {
                    const quizResponse = await fetch(`./quizzes/${quiz.file}`);
                    const quizData = await quizResponse.json();
                    questions[quiz.id] = quizData;
                } catch (error) {
                    console.error(`Failed to load quiz: ${quiz.file}`, error);
                }
            }
            
            return questions;
        } catch (error) {
            console.error('Failed to load quiz manifest:', error);
            throw new Error('Quiz loading failed. Please ensure the server is running and quiz files are accessible.');
        }
    }


    async init() {
        this.questions = await this.initializeQuestions();
        this.bindEvents();
        this.initAudioUI();
        this.checkForSavedGame();
        this.showScreen('start-screen');
    }

    checkForSavedGame() {
        console.log('Checking for saved game...');
        
        if (this.hasSavedGame()) {
            console.log('Saved game found, showing continue options');
            const continueSection = document.getElementById('continue-game-section');
            const gameModeSelection = document.querySelector('.game-mode-selection');
            
            // Show continue option and hide game mode selection
            continueSection.classList.remove('hidden');
            gameModeSelection.style.display = 'none';
            
            // Update saved game info with details
            try {
                const savedState = localStorage.getItem(this.storageKey);
                const gameState = JSON.parse(savedState);
                const infoElement = document.getElementById('saved-game-info');
                
                if (gameState.gameMode === 'team') {
                    infoElement.textContent = `Team tournament in progress: ${gameState.teams.length} teams, Question ${gameState.currentQuestion + 1}`;
                } else {
                    const totalQ = gameState.currentQuestions ? gameState.currentQuestions.length : '?';
                    infoElement.textContent = `Individual game in progress: Question ${gameState.currentQuestion + 1} of ${totalQ}, Topic: ${gameState.currentTopic.toUpperCase()}`;
                }
            } catch (error) {
                document.getElementById('saved-game-info').textContent = 'You have a saved game in progress.';
            }
        } else {
            console.log('No saved game found, showing game mode selection');
            // Hide continue section and show game mode selection
            document.getElementById('continue-game-section').classList.add('hidden');
            document.querySelector('.game-mode-selection').style.display = 'block';
        }
    }


    initAudioUI() {
        const toggleBtn = document.getElementById('audio-toggle');
        if (!this.audioEnabled) {
            toggleBtn.classList.add('muted');
        }
    }

    bindEvents() {
        // Wait for DOM to be ready and bind continue game buttons
        setTimeout(() => {
            const continueGameBtn = document.getElementById('continue-game-btn');
            const newGameBtn = document.getElementById('new-game-btn');
            const deleteAllDataBtn = document.getElementById('delete-all-data-btn');
            
            console.log('Binding continue game buttons:', { continueGameBtn, newGameBtn });
            
            if (continueGameBtn) {
                continueGameBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.continueGame();
                });
            }

            if (newGameBtn) {
                newGameBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.startNewGame();
                });
            }
            
            if (deleteAllDataBtn) {
                console.log('Binding delete all data button');
                deleteAllDataBtn.addEventListener('click', (e) => {
                    console.log('Delete all data button clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteAllSavedData();
                });
            } else {
                console.error('Delete all data button not found!');
            }
        }, 100);

        // Game mode selection
        const individualBtn = document.getElementById('individual-mode-btn');
        const teamBtn = document.getElementById('team-mode-btn');
        
        if (individualBtn && teamBtn) {
            individualBtn.addEventListener('click', () => this.selectGameMode('individual'));
            teamBtn.addEventListener('click', () => this.selectGameMode('team'));
        } else {
            console.error('Game mode buttons not found:', { individualBtn, teamBtn });
        }

        // Team setup (defensive binding)
        const addTeamBtn = document.getElementById('add-team-btn');
        const teamNameInput = document.getElementById('team-name-input');
        const startTournamentBtn = document.getElementById('start-tournament-btn');
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        
        if (addTeamBtn) addTeamBtn.addEventListener('click', () => this.addTeam());
        if (teamNameInput) {
            teamNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addTeam();
            });
        }
        document.querySelectorAll('.quick-team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.addQuickTeam(e.target.textContent));
        });
        if (startTournamentBtn) startTournamentBtn.addEventListener('click', () => this.startTournament());
        if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => this.showScreen('start-screen'));

        // Topic selection is now handled dynamically in generateTopicButtons()

        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDifficulty(e.target.dataset.difficulty));
        });

        // Answer selection
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Make sure we're always getting the button element, not a child element
                const button = e.target.closest('.answer-btn');
                console.log('Button clicked:', { target: e.target, button: button, dataset: button?.dataset });
                this.selectAnswer(button);
            });
        });

        // Lifelines
        document.getElementById('fifty-fifty').addEventListener('click', () => this.useFiftyFifty());
        document.getElementById('ask-audience').addEventListener('click', () => this.askAudience());
        document.getElementById('phone-friend').addEventListener('click', () => this.phoneAFriend());

        // Walk away
        document.getElementById('walk-away').addEventListener('click', () => this.walkAway());

        // Play again (individual mode)
        document.getElementById('play-again').addEventListener('click', () => this.resetGame());
        
        // Team end game options
        const resetReplayBtn = document.getElementById('reset-and-replay');
        const newQuizKeepScoresBtn = document.getElementById('new-quiz-keep-scores');
        const backToModeBtn = document.getElementById('back-to-mode-selection');
        
        if (resetReplayBtn) resetReplayBtn.addEventListener('click', () => this.resetAndReplay());
        if (newQuizKeepScoresBtn) newQuizKeepScoresBtn.addEventListener('click', () => this.newQuizKeepScores());
        if (backToModeBtn) backToModeBtn.addEventListener('click', () => this.backToModeSelection());

        // Team controls (defensive binding)
        const nextTeamBtn = document.getElementById('next-team-btn');
        const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
        const continueTournamentBtn = document.getElementById('continue-tournament-btn');
        const endTournamentBtn = document.getElementById('end-tournament-btn');
        
        if (nextTeamBtn) nextTeamBtn.addEventListener('click', () => this.nextTeam());
        if (showLeaderboardBtn) showLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        if (continueTournamentBtn) continueTournamentBtn.addEventListener('click', () => this.continueTournament());
        if (endTournamentBtn) endTournamentBtn.addEventListener('click', () => this.endTournament());

        // Team decision buttons
        const continueRiskBtn = document.getElementById('continue-risk-btn');
        const passSafeBtn = document.getElementById('pass-safe-btn');
        const nextTeamBtnWrong = document.getElementById('next-team-btn-wrong');
        
        if (continueRiskBtn) continueRiskBtn.addEventListener('click', () => this.teamContinueRisk());
        if (passSafeBtn) passSafeBtn.addEventListener('click', () => this.teamPassSafe());
        if (nextTeamBtnWrong) nextTeamBtnWrong.addEventListener('click', () => this.teamWrongNext());

        // Modal closes
        document.getElementById('close-poll').addEventListener('click', () => this.closeModal('audience-poll'));
        document.getElementById('close-phone').addEventListener('click', () => this.closeModal('phone-friend-modal'));

        // Audio toggle
        document.getElementById('audio-toggle').addEventListener('click', () => this.toggleAudio());

        // Next question button
        document.getElementById('next-question-btn').addEventListener('click', () => this.proceedToNext());

        // Add hover sounds to buttons
        this.addHoverSounds();
    }

    addHoverSounds() {
        const buttons = document.querySelectorAll('button:not(#audio-toggle)');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (this.audioEnabled) {
                    this.playSound('buttonHover');
                }
            });
        });
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        const toggleBtn = document.getElementById('audio-toggle');
        
        if (this.audioEnabled) {
            toggleBtn.classList.remove('muted');
        } else {
            toggleBtn.classList.add('muted');
            this.stopBackgroundMusic();
        }
    }

    selectTopic(topic) {
        this.currentTopic = topic;
        document.getElementById('selected-topic').textContent = topic.toUpperCase();
        this.showScreen('difficulty-screen');
    }

    selectDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.currentQuestions = [...this.questions[this.currentTopic][difficulty]].sort(() => Math.random() - 0.5);
        
        // Save initial game state
        this.saveGameState();
        
        this.showScreen('game-screen');
        this.loadQuestion();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        // Play appropriate background music for each screen
        if (screenId === 'start-screen' || screenId === 'difficulty-screen') {
            this.playBackgroundMusic('introMusic');
        } else if (screenId === 'game-screen') {
            this.playBackgroundMusic('questionTension');
        } else if (screenId === 'result-screen') {
            this.stopBackgroundMusic();
        }
    }

    loadQuestion() {
        const totalQuestions = this.currentQuestions.length;

        if (this.currentQuestion >= totalQuestions) {
            this.endGame(true);
            return;
        }

        const question = this.currentQuestions[this.currentQuestion];
        document.getElementById('current-question').textContent = `${this.currentQuestion + 1} of ${totalQuestions}`;

        // Use money ladder if available, otherwise show question number
        const moneyIndex = Math.min(this.currentQuestion, this.moneyLadder.length - 1);
        document.getElementById('current-money').textContent = this.moneyLadder[moneyIndex];
        
        // Parse markdown and apply syntax highlighting
        const questionElement = document.getElementById('question-text');
        if (typeof marked !== 'undefined') {
            // Configure marked options
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                }
            });
            questionElement.innerHTML = marked.parse(question.question);
        } else {
            // Fallback if marked is not loaded
            questionElement.textContent = question.question;
        }
        
        // Update team UI if in team mode
        if (this.gameMode === 'team') {
            this.updateTeamUI();
        }

        // Load answers with markdown parsing and HTML rendering
        const answerBtns = document.querySelectorAll('.answer-btn');
        answerBtns.forEach((btn, index) => {
            const answerTextElement = btn.querySelector('.answer-text');
            const answerText = question.answers[index];
            
            if (typeof marked !== 'undefined' && answerText.includes('```')) {
                // Code block answers
                answerTextElement.innerHTML = marked.parse(answerText);
            } else if (answerText.includes('<') && answerText.includes('>')) {
                // HTML rendering answers - render as actual HTML
                answerTextElement.innerHTML = answerText;
            } else {
                // Regular text answers
                answerTextElement.textContent = answerText;
            }
            
            btn.classList.remove('selected', 'correct', 'incorrect', 'disabled', 'waiting');
            btn.disabled = false;
            btn.style.pointerEvents = 'auto';
        });

        // Hide explanation from previous question
        document.getElementById('explanation').classList.add('hidden');

        // Update money ladder
        this.updateMoneyLadder();
    }

    updateMoneyLadder() {
        const steps = document.querySelectorAll('.ladder-step');
        steps.forEach((step) => {
            const level = parseInt(step.dataset.level);
            step.classList.remove('current', 'completed');
            if (level < this.currentQuestion + 1) {
                step.classList.add('completed');
            } else if (level === this.currentQuestion + 1) {
                step.classList.add('current');
            }
        });
    }

    selectAnswer(button) {
        if (this.gameOver) return;

        // Immediately disable all buttons to prevent double-clicks
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.classList.remove('selected', 'waiting');
        });

        // Play answer selection sound
        this.playSound('answerSelect');
        
        // Add selected class immediately for clear feedback
        button.classList.add('selected');

        // Play final answer tension music
        this.playBackgroundMusic('finalAnswerTension');

        // Add waiting state after showing selection for a moment
        setTimeout(() => {
            button.classList.add('waiting');
        }, 500);
        
        // Store the selected answer for processing
        let selectedAnswer = button.dataset.answer;
        console.log('Answer selected:', selectedAnswer, 'Button:', button, 'Dataset:', button.dataset);
        
        // Safety check for selectedAnswer
        if (!selectedAnswer) {
            console.error('selectedAnswer is undefined! Button:', button);
            // Fallback: try to get answer from button structure
            const answerButtons = document.querySelectorAll('.answer-btn');
            const buttonIndex = Array.from(answerButtons).indexOf(button);
            selectedAnswer = String.fromCharCode(65 + buttonIndex); // A, B, C, D
            console.log('Using fallback answer:', selectedAnswer);
        }

        // Show the answer after total delay
        setTimeout(() => {
            button.classList.remove('waiting');
            this.revealAnswer(button, selectedAnswer);
        }, 2500);
    }

    revealAnswer(selectedButton, selectedAnswer) {
        const question = this.currentQuestions[this.currentQuestion];
        const correctButton = document.querySelectorAll('.answer-btn')[question.correct];
        
        // Safety check for selectedAnswer
        if (!selectedAnswer || typeof selectedAnswer !== 'string') {
            console.error('Invalid selectedAnswer in revealAnswer:', selectedAnswer);
            // Emergency fallback - find button index
            const answerButtons = document.querySelectorAll('.answer-btn');
            const buttonIndex = Array.from(answerButtons).indexOf(selectedButton);
            selectedAnswer = String.fromCharCode(65 + buttonIndex); // A, B, C, D
            console.log('Emergency fallback answer:', selectedAnswer);
        }
        
        // Convert letter to index for comparison
        const selectedIndex = selectedAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
        const isCorrect = selectedIndex === question.correct;
        
        console.log('Revealing answer:', {
            selected: selectedAnswer,
            selectedIndex: selectedIndex,
            correctIndex: question.correct,
            isCorrect: isCorrect
        });

        // In team mode, only show correct answer if the team got it right
        // This prevents the next team from seeing the answer
        if (this.gameMode !== 'team' || isCorrect) {
            correctButton.classList.add('correct');
        }

        // Show explanation (but not in team mode when answer is wrong)
        if (this.gameMode !== 'team' || isCorrect) {
            document.getElementById('explanation-text').textContent = question.explanation;
            document.getElementById('explanation').classList.remove('hidden');
        }

        if (this.gameMode === 'team') {
            // Update team stats first
            const currentTeam = this.getCurrentTeam();
            const teamStats = this.teamStats.get(currentTeam);
            teamStats.questionsAnswered++;
            
            if (isCorrect) {
                // Award point for correct answer
                teamStats.correctAnswers++;
                teamStats.score += 1; // 1 point per correct answer
                
                this.playSound('correctAnswer');
                setTimeout(() => this.playSound('moneyWin'), 1000);
                
                // Show risk/reward decision
                this.showTeamDecision();
            } else {
                // Wrong answer - lose all points if team was continuing/risking
                teamStats.score = 0; // Reset score to 0 for wrong answers
                
                this.playSound('wrongAnswer');
                selectedButton.classList.add('incorrect');
                
                // Show team wrong section instead of explanation
                document.getElementById('team-decision').classList.add('hidden');
                document.getElementById('team-wrong').classList.remove('hidden');
                
                // Update wrong message based on points lost
                const lostPoints = teamStats.score === 0 ? 0 : teamStats.score + 1; // +1 because we added the point before resetting
                if (lostPoints > 0) {
                    document.getElementById('team-wrong-message').textContent = 
                        `Lost ${lostPoints} point${lostPoints > 1 ? 's' : ''}! Next team's turn.`;
                } else {
                    document.getElementById('team-wrong-message').textContent = 'Wrong answer! Next team\'s turn.';
                }
            }
            
            // Update UI immediately after stats are updated
            this.updateTeamUI();
        } else {
            // Individual mode logic (original)
            if (isCorrect) {
                this.playSound('correctAnswer');
                this.currentQuestion++;
                
                // Save game progress
                this.saveGameState();
                
                const totalQuestions = this.currentQuestions.length;

                if (this.currentQuestion < totalQuestions) {
                    setTimeout(() => this.playSound('moneyWin'), 1000);
                }

                if (this.currentQuestion >= totalQuestions) {
                    document.getElementById('next-question-btn').textContent = 'Finish Game';
                    setTimeout(() => this.playSound('jackpotWin'), 1000);
                } else {
                    document.getElementById('next-question-btn').textContent = 'Next Question';
                }
            } else {
                this.playSound('wrongAnswer');
                selectedButton.classList.add('incorrect');
                document.getElementById('next-question-btn').textContent = 'See Results';
            }
        }
    }

    proceedToNext() {
        const buttonText = document.getElementById('next-question-btn').textContent;
        
        if (this.gameMode === 'team') {
            // Team mode logic
            if (buttonText === 'Continue with Same Team') {
                // Correct answer - advance to next question with same team
                this.currentQuestion++;
                this.prepareNextQuestion();
            } else if (buttonText === 'Next Team' || buttonText === 'Next Team - All Points Lost!') {
                // Wrong answer - move to next team, same question
                this.moveToNextTeam();
                this.prepareNextQuestion();
            }
        } else {
            // Individual mode logic (original)
            if (buttonText === 'Finish Game') {
                this.endGame(true);
            } else if (buttonText === 'See Results') {
                this.endGame(false);
            } else {
                this.loadQuestion();
            }
        }
    }

    prepareNextQuestion() {
        // Reset visual states and re-enable buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect', 'disabled', 'waiting');
            btn.style.display = 'flex';
            btn.disabled = false;
            btn.style.pointerEvents = 'auto';
        });
        
        // Hide explanation, team decision, and team wrong sections
        document.getElementById('explanation').classList.add('hidden');
        document.getElementById('team-decision').classList.add('hidden');
        document.getElementById('team-wrong').classList.add('hidden');
        
        // Update team UI to reflect current state
        if (this.gameMode === 'team') {
            this.updateTeamUI();
        }
        
        // Load the question (current question index is already updated)
        this.loadQuestion();
    }

    moveToNextTeam() {
        // Move to next team in rotation
        this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;
        
        // Reset lifelines for the new team (each team gets fresh lifelines per question)
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        
        // Reset lifeline buttons
        document.querySelectorAll('.lifeline-btn').forEach(btn => {
            btn.classList.remove('used');
            btn.disabled = false;
        });
        
        // Save game state after team switch
        this.saveGameState();
    }

    useFiftyFifty() {
        if (this.usedLifelines.fiftyFifty) return;

        this.playSound('fiftyFifty');

        const question = this.currentQuestions[this.currentQuestion];
        const answerBtns = document.querySelectorAll('.answer-btn');
        const correctIndex = question.correct;
        
        // Get two random wrong answers to disable
        const wrongIndices = [];
        for (let i = 0; i < answerBtns.length; i++) {
            if (i !== correctIndex) wrongIndices.push(i);
        }
        
        // Randomly remove 2 wrong answers
        const toDisable = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
        
        toDisable.forEach(index => {
            answerBtns[index].classList.add('disabled');
            answerBtns[index].disabled = true;
        });

        this.usedLifelines.fiftyFifty = true;
        document.getElementById('fifty-fifty').classList.add('used');
    }

    askAudience() {
        if (this.usedLifelines.askAudience) return;

        this.playSound('askAudience');

        // Clear previous poll results and show classroom instruction
        const pollBars = document.querySelectorAll('.poll-bar');
        pollBars.forEach((bar) => {
            const fill = bar.querySelector('.bar-fill');
            const percentage = bar.querySelector('.poll-percentage');
            fill.style.width = '0%';
            percentage.textContent = '0%';
        });

        // Show modal with classroom instructions
        this.showModal('audience-poll');

        // Update modal content for classroom use
        const modalContent = document.querySelector('#audience-poll .modal-content');
        const originalTitle = modalContent.querySelector('h3');
        originalTitle.textContent = 'Ask the Class';
        
        // Add instruction text if not already there
        let instructionText = modalContent.querySelector('.classroom-instruction');
        if (!instructionText) {
            instructionText = document.createElement('p');
            instructionText.className = 'classroom-instruction';
            instructionText.style.cssText = 'text-align: center; margin: 20px 0; font-size: 18px; color: #fff; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;';
            originalTitle.after(instructionText);
        }
        instructionText.textContent = '📊 Time for your classmates to vote! Show them your options and let them decide what they think the answer is.';

        this.usedLifelines.askAudience = true;
        document.getElementById('ask-audience').classList.add('used');
    }

    phoneAFriend() {
        if (this.usedLifelines.phoneAFriend) return;

        this.playSound('phoneAFriend');

        // Show modal and update content for classroom use
        this.showModal('phone-friend-modal');

        // Update modal title for classroom use
        const modalTitle = document.querySelector('#phone-friend-modal .modal-content h3');
        modalTitle.textContent = 'Phone the Professor';
        
        // Show classroom instruction message
        document.getElementById('friend-message').textContent = "📞 Time to call your professor! Ask them for their expert advice on this question.";

        this.usedLifelines.phoneAFriend = true;
        document.getElementById('phone-friend').classList.add('used');
    }

    walkAway() {
        const currentWinnings = this.currentQuestion > 0 ? this.moneyLadder[this.currentQuestion - 1] : 0;
        this.endGame(false, currentWinnings, "You decided to walk away!");
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    endGame(won, customAmount = null, customMessage = null) {
        this.gameOver = true;
        
        // Clear saved game since the game is over
        this.clearSavedGame();
        
        if (this.gameMode === 'team') {
            // Team mode - show tournament results
            this.showTeamTournamentResults();
        } else {
            // Individual mode - show traditional results
            const finalAmount = customAmount !== null ? customAmount : (won ? this.moneyLadder[9] : (this.currentQuestion > 0 ? this.moneyLadder[this.currentQuestion - 1] : this.moneyLadder[0]));
            
            let title, message;
            if (customMessage) {
                title = "Game Over";
                message = customMessage;
            } else if (won) {
                title = "Congratulations!";
                message = "You've mastered " + this.currentTopic.toUpperCase() + "!";
            } else {
                title = "Game Over";
                message = "Better luck next time!";
            }
            
            document.getElementById('result-title').textContent = title;
            document.getElementById('final-amount').textContent = `You won ${finalAmount}!`;
            document.getElementById('result-message').textContent = message;
            
            // Show individual options
            document.getElementById('individual-end-options').classList.remove('hidden');
            document.getElementById('team-end-options').classList.add('hidden');
            
            setTimeout(() => {
                this.showScreen('result-screen');
            }, 1000);
        }
    }

    resetGame() {
        this.currentQuestion = 0;
        this.currentTopic = null;
        this.currentDifficulty = null;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        this.currentQuestions = [];
        
        // Reset lifeline buttons
        document.querySelectorAll('.lifeline-btn').forEach(btn => btn.classList.remove('used'));
        
        // Reset money ladder
        document.querySelectorAll('.ladder-step').forEach(step => {
            step.classList.remove('current', 'completed');
        });
        document.querySelector('.ladder-step[data-level="1"]').classList.add('current');
        
        // Hide explanation
        document.getElementById('explanation').classList.add('hidden');
        
        this.showScreen('start-screen');
    }

    // Team Tournament Methods
    continueGame() {
        console.log('Attempting to continue game...');
        
        const loadedState = this.loadGameState();
        if (loadedState) {
            console.log('Game state loaded successfully:', loadedState);
            
            // Restore UI state based on game mode
            if (this.gameMode === 'team') {
                this.updateTeamInfo();
                this.showScreen('game-screen');
            } else {
                this.showScreen('game-screen');
            }
            
            // Restore the current question display
            this.loadQuestion();
            
            // Update UI elements
            this.updateMoneyLadder();
            
            // Update lifeline buttons based on used state
            document.querySelectorAll('.lifeline-btn').forEach(btn => {
                const lifelineType = btn.id.replace('-', '').replace('fifty', 'fiftyFifty');
                if (this.usedLifelines[lifelineType]) {
                    btn.classList.add('used');
                    btn.disabled = true;
                }
            });
            
            console.log(`Resumed ${this.gameMode} game at question ${this.currentQuestion + 1}`);
        } else {
            console.error('Failed to load game state');
            this.startNewGame();
        }
    }

    startNewGame() {
        console.log('Starting new game...');
        
        // Clear any saved game
        this.clearSavedGame();
        
        // Reset game state
        this.currentQuestion = 0;
        this.currentTopic = null;
        this.currentDifficulty = null;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        this.teams = [];
        this.currentTeamIndex = 0;
        this.teamStats = new Map();
        this.currentQuestions = [];
        
        // Reset the start screen to show game mode selection
        document.getElementById('continue-game-section').classList.add('hidden');
        document.querySelector('.game-mode-selection').style.display = 'block';
    }

    selectGameMode(mode) {
        this.gameMode = mode;
        if (mode === 'individual') {
            this.generateTopicButtons();
            this.showScreen('topic-screen');
            document.getElementById('topic-subtitle').textContent = 'Choose your quiz topic!';
        } else {
            this.showScreen('team-setup-screen');
        }
    }

    async generateTopicButtons() {
        try {
            const manifestResponse = await fetch('./quizzes/quizzes.json');
            const manifest = await manifestResponse.json();
            
            const topicContainer = document.getElementById('topic-buttons');
            topicContainer.innerHTML = ''; // Clear existing buttons
            
            // Generate buttons for all available quizzes
            manifest.available.forEach(quiz => {
                const button = document.createElement('button');
                button.className = 'topic-btn';
                button.setAttribute('data-topic', quiz.id);
                button.textContent = quiz.name;
                button.title = quiz.description; // Show description on hover
                
                // Add click event listener
                button.addEventListener('click', () => this.selectTopic(quiz.id));
                
                topicContainer.appendChild(button);
            });
        } catch (error) {
            console.error('Failed to generate topic buttons:', error);
            throw new Error('Topic loading failed. Please ensure the server is running and quiz files are accessible.');
        }
    }


    addTeam() {
        const input = document.getElementById('team-name-input');
        const teamName = input.value.trim();
        
        if (teamName && !this.teams.includes(teamName)) {
            this.teams.push(teamName);
            this.teamStats.set(teamName, { score: 0, questionsAnswered: 0, correctAnswers: 0 });
            this.updateTeamsList();
            input.value = '';
            this.updateStartTournamentButton();
        }
    }

    addQuickTeam(teamName) {
        if (!this.teams.includes(teamName)) {
            this.teams.push(teamName);
            this.teamStats.set(teamName, { score: 0, questionsAnswered: 0, correctAnswers: 0 });
            this.updateTeamsList();
            this.updateStartTournamentButton();
        }
    }

    updateTeamsList() {
        const teamsList = document.getElementById('teams-list');
        teamsList.innerHTML = '';
        
        this.teams.forEach((team, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="team-name">${team}</span>
                <button class="remove-team-btn" data-team="${team}">Remove</button>
            `;
            teamsList.appendChild(li);
        });

        // Add remove event listeners
        document.querySelectorAll('.remove-team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeTeam(e.target.dataset.team));
        });
    }

    removeTeam(teamName) {
        this.teams = this.teams.filter(team => team !== teamName);
        this.teamStats.delete(teamName);
        this.updateTeamsList();
        this.updateStartTournamentButton();
    }

    updateStartTournamentButton() {
        const btn = document.getElementById('start-tournament-btn');
        btn.disabled = this.teams.length < 2;
        btn.textContent = this.teams.length < 2 ? 'Add at least 2 teams' : 'Start Tournament';
    }

    startTournament() {
        if (this.teams.length >= 2) {
            this.currentTeamIndex = 0;
            
            // Save initial tournament state
            this.saveGameState();
            
            this.generateTopicButtons();
            this.showScreen('topic-screen');
            document.getElementById('topic-subtitle').textContent = `Team tournament with ${this.teams.length} teams!`;
        }
    }

    getCurrentTeam() {
        return this.teams[this.currentTeamIndex];
    }

    updateTeamUI() {
        if (this.gameMode === 'team') {
            const teamInfo = document.getElementById('team-info');
            const currentTeam = this.getCurrentTeam();
            const teamStats = this.teamStats.get(currentTeam);
            
            teamInfo.classList.remove('hidden');
            document.getElementById('current-team-name').textContent = currentTeam;
            document.getElementById('team-question-num').textContent = this.currentQuestion + 1;
            document.getElementById('team-score').textContent = teamStats.score;
            
            console.log('Team UI Updated:', { 
                team: currentTeam, 
                score: teamStats.score, 
                questionsAnswered: teamStats.questionsAnswered,
                currentQuestion: this.currentQuestion
            });
        }
    }

    nextTeam() {
        if (this.gameMode === 'team') {
            this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;
            this.resetForNewTeam();
            this.updateTeamUI();
            this.loadQuestion();
        }
    }

    resetForNewTeam() {
        this.currentQuestion = 0;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        
        // Reset lifeline buttons
        document.querySelectorAll('.lifeline-btn').forEach(btn => {
            btn.classList.remove('used');
            btn.disabled = false;
        });

        // Reset money ladder
        document.querySelectorAll('.ladder-step').forEach(step => {
            step.classList.remove('current', 'completed');
        });
        document.querySelector('.ladder-step[data-level="1"]').classList.add('current');
    }

    showLeaderboard() {
        this.updateLeaderboardDisplay();
        this.showScreen('leaderboard-screen');
    }

    updateLeaderboardDisplay() {
        const rows = document.getElementById('leaderboard-rows');
        rows.innerHTML = '';
        
        // Sort teams by score (descending)
        const sortedTeams = [...this.teams].sort((a, b) => {
            const scoreA = this.teamStats.get(a).score;
            const scoreB = this.teamStats.get(b).score;
            return scoreB - scoreA;
        });

        sortedTeams.forEach((team, index) => {
            const stats = this.teamStats.get(team);
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="team-name">${team}</span>
                <span class="score">${stats.score}</span>
                <span class="questions">${stats.questionsAnswered}</span>
            `;
            rows.appendChild(row);
        });
    }

    continueTournament() {
        this.showScreen('game-screen');
    }

    endTournament() {
        this.showFinalResults();
    }

    showFinalResults() {
        const winner = [...this.teams].sort((a, b) => {
            return this.teamStats.get(b).score - this.teamStats.get(a).score;
        })[0];
        
        const winnerStats = this.teamStats.get(winner);
        
        document.getElementById('result-title').textContent = 'Tournament Complete!';
        document.getElementById('final-amount').textContent = `Winner: ${winner}`;
        document.getElementById('result-message').textContent = `Final Score: ${winnerStats.score} points!`;
        
        this.showScreen('result-screen');
    }

    // Team Decision Methods
    showTeamDecision() {
        const currentTeam = this.getCurrentTeam();
        const teamStats = this.teamStats.get(currentTeam);
        
        // Hide explanation and show decision
        document.getElementById('explanation').classList.add('hidden');
        document.getElementById('team-decision').classList.remove('hidden');
        
        // Update button text to show current points at risk
        const pointText = teamStats.score === 1 ? 'point' : 'points';
        document.querySelector('#continue-risk-btn .btn-description').textContent = 
            `Try next question - lose ALL ${teamStats.score} ${pointText} if wrong`;
        document.querySelector('#pass-safe-btn .btn-description').textContent = 
            `Keep ${teamStats.score} ${pointText} safe - next team plays`;
    }

    teamContinueRisk() {
        // Team chooses to continue and risk all points
        document.getElementById('team-decision').classList.add('hidden');
        this.currentQuestion++;
        
        // Save game progress
        this.saveGameState();
        
        this.prepareNextQuestion();
        
        console.log(`${this.getCurrentTeam()} chose to continue and risk ${this.teamStats.get(this.getCurrentTeam()).score} points`);
    }

    teamPassSafe() {
        // Team chooses to pass and keep points safe
        document.getElementById('team-decision').classList.add('hidden');
        this.currentQuestion++; // Move to next question
        
        // Save game progress
        this.saveGameState();
        
        this.moveToNextTeam();  // Move to next team
        this.prepareNextQuestion();
        
        console.log(`${this.getCurrentTeam()} chose to pass and keep points safe - moving to next question`);
    }

    teamWrongNext() {
        // Team got wrong answer - move to next team, same question
        document.getElementById('team-wrong').classList.add('hidden');
        this.moveToNextTeam();
        this.prepareNextQuestion();
        
        console.log('Moving to next team after wrong answer');
    }

    // Team Tournament End Game Methods
    showTeamTournamentResults() {
        // Find winner (highest score)
        const winner = [...this.teams].sort((a, b) => {
            return this.teamStats.get(b).score - this.teamStats.get(a).score;
        })[0];
        
        const winnerStats = this.teamStats.get(winner);
        
        // Update main result display
        document.getElementById('result-title').textContent = 'Tournament Complete!';
        document.getElementById('final-amount').textContent = `🏆 ${winner} Wins!`;
        document.getElementById('result-message').textContent = `Congratulations on an amazing tournament!`;
        
        // Update winner display
        document.getElementById('winning-team').textContent = winner;
        document.getElementById('winning-score').textContent = `Final Score: ${winnerStats.score} point${winnerStats.score !== 1 ? 's' : ''}`;
        
        // Update final standings
        this.updateFinalStandings();
        
        // Show team options
        document.getElementById('individual-end-options').classList.add('hidden');
        document.getElementById('team-end-options').classList.remove('hidden');
        
        setTimeout(() => {
            this.showScreen('result-screen');
        }, 1000);
    }

    updateFinalStandings() {
        const standings = document.getElementById('final-standings');
        standings.innerHTML = '';
        
        // Sort teams by score (descending)
        const sortedTeams = [...this.teams].sort((a, b) => {
            return this.teamStats.get(b).score - this.teamStats.get(a).score;
        });

        sortedTeams.forEach((team, index) => {
            const stats = this.teamStats.get(team);
            const standing = document.createElement('div');
            standing.className = 'standing-row';
            standing.innerHTML = `
                <span class="standing-rank">${index + 1}.</span>
                <span class="standing-team">${team}</span>
                <span class="standing-score">${stats.score} pt${stats.score !== 1 ? 's' : ''}</span>
            `;
            standings.appendChild(standing);
        });
    }

    // End Game Options
    resetAndReplay() {
        // Reset all team scores to 0
        this.teams.forEach(team => {
            this.teamStats.set(team, { score: 0, questionsAnswered: 0, correctAnswers: 0 });
        });
        this.currentTeamIndex = 0;
        this.currentQuestion = 0;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        
        this.generateTopicButtons();
        this.showScreen('topic-screen');
        document.getElementById('topic-subtitle').textContent = `Team tournament with ${this.teams.length} teams!`;
    }

    newQuizKeepScores() {
        // Keep current scores, just reset game state
        this.currentTeamIndex = 0;
        this.currentQuestion = 0;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        
        this.generateTopicButtons();
        this.showScreen('topic-screen');
        document.getElementById('topic-subtitle').textContent = `Continue tournament with current scores!`;
    }

    backToModeSelection() {
        // Complete reset - back to individual vs team choice
        this.gameMode = 'individual';
        this.teams = [];
        this.currentTeamIndex = 0;
        this.teamStats = new Map();
        this.currentQuestion = 0;
        this.currentTopic = null;
        this.currentDifficulty = null;
        this.gameOver = false;
        this.usedLifelines = {
            fiftyFifty: false,
            askAudience: false,
            phoneAFriend: false
        };
        
        this.stopBackgroundMusic();
        this.playBackgroundMusic('introMusic');
        this.showScreen('start-screen');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MillionaireGame();
});