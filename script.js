// 游戏配置
let BOARD_SIZE = 15; // 将改为根据屏幕大小动态调整
const DIFFICULTY_LEVELS = {
    EASY: { 
        timeLimit: 180, // 3分钟
        goldenAppleReduction: 1, // 不减少
        totalMonsters: 10 // 简单模式下怪物总数为10个
    },
    MEDIUM: { 
        timeLimit: 120, // 2分钟
        goldenAppleReduction: 1, // 不减少
        totalMonsters: 10 // 中等模式下怪物总数为10个
    },
    HARD: { 
        timeLimit: 60, // 1分钟
        goldenAppleReduction: 0.67, // 减少三分之一
        totalMonsters: 10 // 困难模式下怪物总数为10个
    }
};

const BLOCK_TYPES = {
    STONE: 'stone',
    DIAMOND_ORE: 'diamond-ore',
    LAVA: 'lava',
    EMPTY: 'mined',
    WOOD: 'wood',
    TNT: 'tnt',
    ANTIMATTER_TNT: 'antimatter-tnt',
    WATER: 'water',
    COBBLESTONE: 'cobblestone',
    MONSTER: 'monster',
    ZOMBIE: 'zombie',
    GLASS: 'glass',
    DIRT: 'dirt',
    GOLDEN_APPLE: 'golden-apple'
};

// 生物类型
const MOB_TYPES = {
    MONSTER: 'monster',
    ZOMBIE: 'zombie'
};

// 游戏状态
let gameState = {
    board: [],
    playerPosition: { x: 7, y: 7 },
    previousPosition: null, // 上一个位置，用于原路返回
    inventory: {
        diamond: 0,
        tnt: 0,
        antimatterTnt: 0,
        diamondSword: 1, // 初始就有一把钻石剑
        goldenApple: 0
    },
    hasDiamondSword: true, // 初始就拥有钻石剑
    health: 10, // 玩家初始生命值调整为10点
    difficulty: 'medium', // 默认难度为中等
    // 用于跟踪方块状态
    blockStates: {}, // 存储需要多次点击的方块状态
    timer: null, // 计时器
    timeLeft: 180, // 剩余时间（秒），初始为中等难度的180秒
    hasWon: false, // 标记游戏是否已获胜
    hasStarted: false, // 标记游戏是否已开始（第一次操作）
    // 触控相关状态
    touchStartTime: 0, // 触摸开始时间
    touchPosition: null, // 触摸位置
    longPressTimer: null, // 长按计时器
    isTouchDevice: false, // 是否为触控设备
    // 纪录相关状态
    gameStartTime: 0, // 游戏开始时间戳
    bestTime: null // 最短胜利时间（秒）
};

// 根据屏幕大小计算合适的游戏板尺寸
function calculateBoardSize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const maxBoardWidth = screenWidth * 0.9; // 游戏板最大宽度为屏幕宽度的90%
    const maxBoardHeight = screenHeight * 0.6; // 游戏板最大高度为屏幕高度的60%
    
    // 计算每个方块的最大尺寸（考虑边距和间隙）
    const maxCellSize = Math.floor(Math.min(maxBoardWidth, maxBoardHeight) / 15);
    
    // 根据方块大小计算合适的游戏板尺寸
    if (maxCellSize >= 40) {
        return 15; // 大屏幕，使用15x15
    } else if (maxCellSize >= 30) {
        return 12; // 中等屏幕，使用12x12
    } else if (maxCellSize >= 25) {
        return 10; // 小屏幕，使用10x10
    } else {
        return 8;  // 超小屏幕，使用8x8
    }
}

// 初始化游戏
function initGame() {
    // 检测是否为触控设备
    gameState.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 根据屏幕大小调整游戏板尺寸
    BOARD_SIZE = calculateBoardSize();
    
    // 更新玩家初始位置为游戏板中心
    gameState.playerPosition = { 
        x: Math.floor(BOARD_SIZE / 2), 
        y: Math.floor(BOARD_SIZE / 2) 
    };
    
    // 设置难度选择按钮事件监听器
    document.getElementById('difficulty-easy').addEventListener('click', () => changeDifficulty('easy'));
    document.getElementById('difficulty-medium').addEventListener('click', () => changeDifficulty('medium'));
    document.getElementById('difficulty-hard').addEventListener('click', () => changeDifficulty('hard'));
    
    console.log('初始化游戏...');
    loadBestTime(); // 加载最佳纪录
    createBoard();
    
    // 确保玩家初始位置是空方块，以便能够移动
    if (gameState.board && gameState.board[gameState.playerPosition.y]) {
        gameState.board[gameState.playerPosition.y][gameState.playerPosition.x] = BLOCK_TYPES.EMPTY;
        console.log('设置玩家初始位置为空方块');
    } else {
        console.error('无法设置玩家初始位置');
    }
    
    console.log('开始渲染游戏板...');
    renderBoard();
    console.log('游戏板渲染完成');
    updateStats();
    updateTimerDisplay(); // 初始化计时器显示
    updateBestTimeDisplay(); // 更新最佳纪录显示
    
    
    
    // 添加键盘控制
    document.addEventListener('keydown', handleKeyPress);
    
    // 如果是触控设备，添加触控事件
    if (gameState.isTouchDevice) {
        setupTouchControls();
    }
    
    // 监听窗口大小变化，动态调整游戏板
    window.addEventListener('resize', () => {
        const newSize = calculateBoardSize();
        if (newSize !== BOARD_SIZE) {
            showCustomDialog('Minecraft矿洞探险', '检测到屏幕大小变化，是否重新开始游戏以适应新尺寸？', resetGame);
        }
    });
    
    // 设置帮助弹窗事件监听器
    setupHelpModal();
}

// 创建游戏板
function createBoard() {
    gameState.board = [];
    
    console.log(`开始创建游戏板，大小: ${BOARD_SIZE}x${BOARD_SIZE}`);
    
    // 根据难度获取金苹果减少比例和怪物总数
    const difficultyConfig = DIFFICULTY_LEVELS[gameState.difficulty.toUpperCase()];
    const goldenAppleReduction = difficultyConfig ? difficultyConfig.goldenAppleReduction : 1;
    const totalMonsters = difficultyConfig ? difficultyConfig.totalMonsters : 10;
    
    // 计算游戏板中心位置
    const centerX = Math.floor(BOARD_SIZE / 2);
    const centerY = Math.floor(BOARD_SIZE / 2);
    const safeZoneSize = Math.max(1, Math.floor(BOARD_SIZE / 5)); // 安全区大小为游戏板大小的1/5
    
    // 初始化游戏板
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 在中心附近生成玩家安全区域
            if (Math.abs(x - centerX) <= safeZoneSize && Math.abs(y - centerY) <= safeZoneSize) {
                row.push(BLOCK_TYPES.STONE);
            } else {
                // 初始化为石头
                row.push(BLOCK_TYPES.STONE);
            }
        }
        gameState.board.push(row);
    }
    
    console.log(`游戏板初始化完成，共 ${gameState.board.length} 行`);
    
    // 随机放置怪物，总数由难度决定
    let monstersPlaced = 0;
    const placedMonsters = []; // 记录已放置怪物的位置，确保总数准确
    
    while (monstersPlaced < totalMonsters) {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        
        // 确保不在玩家安全区域内放置怪物
        if (Math.abs(x - centerX) <= safeZoneSize && Math.abs(y - centerY) <= safeZoneSize) {
            continue;
        }
        
        // 确保该位置不是空方块或已经放置了怪物
        if (gameState.board[y][x] === BLOCK_TYPES.STONE) {
            // 随机选择怪物类型
            const mobRand = Math.random();
            let monsterType;
            if (mobRand < 0.6) {
                monsterType = BLOCK_TYPES.MONSTER;
            } else {
                monsterType = BLOCK_TYPES.ZOMBIE;
            }
            
            gameState.board[y][x] = monsterType;
            placedMonsters.push({x, y, type: monsterType});
            monstersPlaced++;
        }
    }
    
    // 填充其他方块
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 跳过玩家安全区域和已放置怪物的位置
            if ((Math.abs(x - centerX) <= safeZoneSize && Math.abs(y - centerY) <= safeZoneSize) || 
                [BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE].includes(gameState.board[y][x])) {
                continue;
            }
            
            // 根据位置生成不同的方块
            const rand = Math.random();
            const topLayer = Math.floor(BOARD_SIZE * 0.2); // 顶层为游戏板大小的20%
            const middleLayer = Math.floor(BOARD_SIZE * 0.53); // 中层为游戏板大小的53%
            const deepLayer = Math.floor(BOARD_SIZE * 0.8); // 深层为游戏板大小的80%
            
            if (y < topLayer) {
                // 顶层多为石头、木头、泥土、玻璃
                if (rand < 0.35) {
                    gameState.board[y][x] = BLOCK_TYPES.STONE;
                } else if (rand < 0.55) {
                    gameState.board[y][x] = BLOCK_TYPES.WOOD;
                } else if (rand < 0.7) {
                    gameState.board[y][x] = BLOCK_TYPES.DIRT;
                } else if (rand < 0.85) {
                    gameState.board[y][x] = BLOCK_TYPES.GLASS;
                } else {
                    // 根据难度调整金苹果出现概率
                    if (Math.random() < goldenAppleReduction) {
                        gameState.board[y][x] = BLOCK_TYPES.GOLDEN_APPLE;
                    } else {
                        gameState.board[y][x] = BLOCK_TYPES.STONE; // 用石头替代部分金苹果
                    }
                }
            } else if (y < middleLayer) {
                // 中层石头、木头、鹅卵石、泥土
                if (rand < 0.3) {
                    gameState.board[y][x] = BLOCK_TYPES.STONE;
                } else if (rand < 0.5) {
                    gameState.board[y][x] = BLOCK_TYPES.WOOD;
                } else if (rand < 0.65) {
                    gameState.board[y][x] = BLOCK_TYPES.COBBLESTONE;
                } else if (rand < 0.8) {
                    gameState.board[y][x] = BLOCK_TYPES.DIRT;
                } else if (rand < 0.85) {
                    gameState.board[y][x] = BLOCK_TYPES.DIAMOND_ORE;
                } else {
                    // 根据难度调整金苹果出现概率
                    if (Math.random() < goldenAppleReduction) {
                        gameState.board[y][x] = BLOCK_TYPES.GOLDEN_APPLE;
                    } else {
                        gameState.board[y][x] = BLOCK_TYPES.STONE; // 用石头替代部分金苹果
                    }
                }
            } else if (y < deepLayer) {
                // 深层钻石、TNT、水、玻璃、金苹果
                if (rand < 0.2) {
                    gameState.board[y][x] = BLOCK_TYPES.STONE;
                } else if (rand < 0.3) {
                    gameState.board[y][x] = BLOCK_TYPES.DIAMOND_ORE;
                } else if (rand < 0.4) {
                    gameState.board[y][x] = BLOCK_TYPES.TNT;
                } else if (rand < 0.45) {
                    gameState.board[y][x] = BLOCK_TYPES.ANTIMATTER_TNT;
                } else if (rand < 0.55) {
                    gameState.board[y][x] = BLOCK_TYPES.WATER;
                } else if (rand < 0.65) {
                    gameState.board[y][x] = BLOCK_TYPES.GLASS;
                } else if (rand < 0.95) {
                    gameState.board[y][x] = BLOCK_TYPES.DIAMOND_ORE; // 额外的钻石
                } else {
                    // 根据难度调整金苹果出现概率
                    if (Math.random() < goldenAppleReduction) {
                        gameState.board[y][x] = BLOCK_TYPES.GOLDEN_APPLE;
                    } else {
                        gameState.board[y][x] = BLOCK_TYPES.STONE; // 用石头替代部分金苹果
                    }
                }
            } else {
                // 最深层加入岩浆、TNT和其他方块
                if (rand < 0.15) {
                    gameState.board[y][x] = BLOCK_TYPES.STONE;
                } else if (rand < 0.25) {
                    gameState.board[y][x] = BLOCK_TYPES.DIAMOND_ORE;
                } else if (rand < 0.4) {
                    gameState.board[y][x] = BLOCK_TYPES.LAVA;
                } else if (rand < 0.5) {
                    gameState.board[y][x] = BLOCK_TYPES.TNT;
                } else if (rand < 0.55) {
                    gameState.board[y][x] = BLOCK_TYPES.ANTIMATTER_TNT;
                } else if (rand < 0.65) {
                    gameState.board[y][x] = BLOCK_TYPES.GLASS;
                } else {
                    // 根据难度调整金苹果出现概率
                    if (Math.random() < goldenAppleReduction) {
                        gameState.board[y][x] = BLOCK_TYPES.GOLDEN_APPLE;
                    } else {
                        gameState.board[y][x] = BLOCK_TYPES.STONE; // 用石头替代部分金苹果
                    }
                }
            }
        }
    }
}

// 设置触控控制
function setupTouchControls() {
    const gameBoard = document.getElementById('gameBoard');
    
    // 添加触摸开始事件
    gameBoard.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameBoard.addEventListener('mousedown', handleMouseDown); // 同时支持鼠标操作
    
    // 添加触摸结束事件
    gameBoard.addEventListener('touchend', handleTouchEnd, { passive: false });
    gameBoard.addEventListener('mouseup', handleMouseUp); // 同时支持鼠标操作
    
    // 添加触摸移动事件（用于防止滑动时误触）
    gameBoard.addEventListener('touchmove', handleTouchMove, { passive: false });
}

// 处理触摸开始事件
function handleTouchStart(event) {
    event.preventDefault(); // 防止默认行为
    
    const touch = event.touches[0];
    const cell = event.target.closest('.cell');
    
    if (cell) {
        gameState.touchPosition = {
            x: parseInt(cell.dataset.x),
            y: parseInt(cell.dataset.y)
        };
        gameState.touchStartTime = Date.now();
        
        // 添加视觉反馈
        cell.classList.add('touch-active');
        
        // 设置长按计时器（500ms后触发挖掘）
        gameState.longPressTimer = setTimeout(() => {
            handleLongPress(cell);
        }, 500);
    }
}

// 处理鼠标按下事件（用于桌面测试）
function handleMouseDown(event) {
    const cell = event.target.closest('.cell');
    
    if (cell) {
        gameState.touchPosition = {
            x: parseInt(cell.dataset.x),
            y: parseInt(cell.dataset.y)
        };
        gameState.touchStartTime = Date.now();
        
        // 添加视觉反馈
        cell.classList.add('touch-active');
        
        // 设置长按计时器（500ms后触发挖掘）
        gameState.longPressTimer = setTimeout(() => {
            handleLongPress(cell);
        }, 500);
    }
}

// 处理触摸移动事件
function handleTouchMove(event) {
    // 如果手指移动了，取消长按计时器
    if (gameState.longPressTimer) {
        clearTimeout(gameState.longPressTimer);
        gameState.longPressTimer = null;
    }
    
    // 移除所有活动状态
    document.querySelectorAll('.touch-active').forEach(cell => {
        cell.classList.remove('touch-active');
    });
}

// 处理触摸结束事件
function handleTouchEnd(event) {
    event.preventDefault(); // 防止默认行为
    
    // 清除长按计时器
    if (gameState.longPressTimer) {
        clearTimeout(gameState.longPressTimer);
        gameState.longPressTimer = null;
    }
    
    // 移除所有活动状态
    document.querySelectorAll('.touch-active').forEach(cell => {
        cell.classList.remove('touch-active');
    });
    
    // 计算触摸持续时间
    const touchDuration = Date.now() - gameState.touchStartTime;
    
    // 如果是短按（少于500ms），则尝试移动到该位置
    if (touchDuration < 500 && gameState.touchPosition) {
        handleCellTouch(gameState.touchPosition.x, gameState.touchPosition.y);
    }
    
    // 重置触控状态
    gameState.touchPosition = null;
    gameState.touchStartTime = 0;
}

// 处理鼠标释放事件（用于桌面测试）
function handleMouseUp(event) {
    // 清除长按计时器
    if (gameState.longPressTimer) {
        clearTimeout(gameState.longPressTimer);
        gameState.longPressTimer = null;
    }
    
    // 移除所有活动状态
    document.querySelectorAll('.touch-active').forEach(cell => {
        cell.classList.remove('touch-active');
    });
    
    // 计算触摸持续时间
    const touchDuration = Date.now() - gameState.touchStartTime;
    
    // 如果是短按（少于500ms），则尝试移动到该位置
    if (touchDuration < 500 && gameState.touchPosition) {
        handleCellTouch(gameState.touchPosition.x, gameState.touchPosition.y);
    }
    
    // 重置触控状态
    gameState.touchPosition = null;
    gameState.touchStartTime = 0;
}

// 处理长按事件
function handleLongPress(cell) {
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    
    // 如果长按的是玩家当前位置，则挖掘当前方块
    if (x === gameState.playerPosition.x && y === gameState.playerPosition.y) {
        mineBlock();
        
        // 添加挖掘动画效果
        cell.style.animation = 'mineAnimation 0.3s';
        setTimeout(() => {
            cell.style.animation = '';
        }, 300);
    }
    
    // 清除长按计时器
    gameState.longPressTimer = null;
}

// 自定义弹窗函数
function showCustomDialog(title, message, onConfirm, showCancel = true) {
    // 创建弹窗元素
    const dialogOverlay = document.createElement('div');
    dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const dialogBox = document.createElement('div');
    dialogBox.style.cssText = `
        background-color: #444;
        border: 2px solid #4CAF50;
        border-radius: 8px;
        padding: 20px;
        max-width: 90%;
        width: 300px;
        text-align: center;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    `;
    
    const dialogTitle = document.createElement('h2');
    dialogTitle.textContent = title;
    dialogTitle.style.cssText = `
        color: #4CAF50;
        margin-top: 0;
        margin-bottom: 15px;
    `;
    
    const dialogMessage = document.createElement('p');
    dialogMessage.textContent = message;
    dialogMessage.style.cssText = `
        color: #fff;
        margin-bottom: 20px;
    `;
    
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '确定';
    confirmButton.style.cssText = `
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin-right: 10px;
    `;
    
    // 创建关闭弹窗的函数
    const closeDialog = () => {
        document.body.removeChild(dialogOverlay);
        if (onConfirm) onConfirm();
    };
    
    // 添加事件监听器
    confirmButton.addEventListener('click', closeDialog);
    
    // 添加键盘事件监听器（空格键和回车键关闭弹窗）
    const handleKeyPress = (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            closeDialog();
        }
    };
    
    // 添加键盘监听器
    document.addEventListener('keydown', handleKeyPress);
    
    // 在弹窗关闭时移除键盘监听器
    const originalCloseDialog = closeDialog;
    const closeDialogWithCleanup = () => {
        document.removeEventListener('keydown', handleKeyPress);
        originalCloseDialog();
    };
    
    // 更新关闭函数引用
    confirmButton.removeEventListener('click', closeDialog);
    confirmButton.addEventListener('click', closeDialogWithCleanup);
    
    // 组装弹窗
    dialogBox.appendChild(dialogTitle);
    dialogBox.appendChild(dialogMessage);
    dialogBox.appendChild(confirmButton);
    
    // 只有在需要时才添加取消按钮
    if (showCancel) {
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            background-color: #555;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        `;
        
        cancelButton.addEventListener('click', () => {
            document.removeEventListener('keydown', handleKeyPress);
            document.body.removeChild(dialogOverlay);
        });
        
        dialogBox.appendChild(cancelButton);
    }
    
    dialogOverlay.appendChild(dialogBox);
    
    // 添加到页面
    document.body.appendChild(dialogOverlay);
    
    // 自动聚焦到确定按钮，使其能接收键盘事件
    confirmButton.focus();
}

// 处理方块点击/触摸事件
function handleCellTouch(x, y) {
    // 计算移动方向
    const dx = x - gameState.playerPosition.x;
    const dy = y - gameState.playerPosition.y;
    
    // 确定主要移动方向（优先移动距离更大的轴）
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平移动
        if (dx > 0) {
            movePlayer(1, 0); // 向右
        } else if (dx < 0) {
            movePlayer(-1, 0); // 向左
        }
    } else if (Math.abs(dy) > 0) {
        // 垂直移动
        if (dy > 0) {
            movePlayer(0, 1); // 向下
        } else if (dy < 0) {
            movePlayer(0, -1); // 向上
        }
    }
    
    // 如果点击的是玩家当前位置，则挖掘当前方块
    if (dx === 0 && dy === 0) {
        mineBlock();
    }
}

// 渲染游戏板
function renderBoard() {
    const gameBoard = document.getElementById('gameBoard');
    if (!gameBoard) {
        console.error('游戏板元素未找到');
        return;
    }
    
    gameBoard.innerHTML = '';
    
    // 确保游戏板数据存在
    if (!gameState.board || gameState.board.length === 0) {
        console.error('游戏板数据不存在，正在重新创建');
        createBoard();
        if (!gameState.board || gameState.board.length === 0) {
            console.error('无法创建游戏板数据');
            return;
        }
    }
    
    // 计算合适的方块大小
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const maxBoardWidth = Math.min(screenWidth * 0.9, 600); // 限制最大宽度
    const maxBoardHeight = Math.min(screenHeight * 0.6, 600); // 限制最大高度
    
    // 计算方块大小，确保最小为20px，最大为40px
    const cellSize = Math.min(
        Math.max(Math.floor(maxBoardWidth / BOARD_SIZE), 20),
        Math.max(Math.floor(maxBoardHeight / BOARD_SIZE), 20),
        40
    );
    
    // 设置游戏板网格布局
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${cellSize}px)`;
    gameBoard.style.gridTemplateRows = `repeat(${BOARD_SIZE}, ${cellSize}px)`;
    
    // 调试信息
    console.log(`游戏板大小: ${BOARD_SIZE}x${BOARD_SIZE}, 方块大小: ${cellSize}px`);
    console.log(`游戏板数据行数: ${gameState.board.length}`);
    
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            const blockType = gameState.board[y] && gameState.board[y][x] ? gameState.board[y][x] : BLOCK_TYPES.STONE;
            cell.className = `cell ${blockType}`;
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // 设置方块大小
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.minWidth = `${cellSize}px`;
            cell.style.minHeight = `${cellSize}px`;
            
            // 调整字体大小以适应方块
            const fontSize = Math.max(12, Math.floor(cellSize * 0.5));
            cell.style.fontSize = `${fontSize}px`;
            
            // 显示玩家位置
            if (x === gameState.playerPosition.x && y === gameState.playerPosition.y) {
                cell.classList.add('player');
            }
            
            gameBoard.appendChild(cell);
        }
    }
    
    console.log(`已创建 ${gameBoard.children.length} 个方块元素`);
}

// 更新统计信息
function updateStats() {
    // 更新生命值显示
    updateHealthDisplay();
}

// 更新生命值显示
function updateHealthDisplay() {
    const healthElement = document.getElementById('healthCount');
    if (healthElement) {
        healthElement.textContent = gameState.health;
        
        // 根据生命值改变颜色
        if (gameState.health <= 2) {
            healthElement.style.color = '#ff3333'; // 红色 - 危险
            healthElement.style.textShadow = '0 0 5px rgba(255, 0, 0, 0.5)';
        } else if (gameState.health <= 5) {
            healthElement.style.color = '#ff9900'; // 橙色 - 警告
            healthElement.style.textShadow = '0 0 3px rgba(255, 153, 0, 0.3)';
        } else {
            healthElement.style.color = '#ff6666'; // 浅红色 - 正常
            healthElement.style.textShadow = '0 0 3px rgba(255, 102, 102, 0.3)';
        }
    }
}

// 移动玩家
function movePlayer(dx, dy) {
    const newX = gameState.playerPosition.x + dx;
    const newY = gameState.playerPosition.y + dy;
    
    // 检查边界
    if (newX >= 0 && newX < BOARD_SIZE && newY >= 0 && newY < BOARD_SIZE) {
        // 检查当前位置是否为空方块（玩家只能从空方块位置移动）
        const currentBlockType = gameState.board[gameState.playerPosition.y][gameState.playerPosition.x];
        
        // 检查是否是原路返回（如果有上一个位置且目标位置就是上一个位置）
        const isReturningToPrevious = gameState.previousPosition && 
                                    newX === gameState.previousPosition.x && 
                                    newY === gameState.previousPosition.y;
        
        if (currentBlockType === BLOCK_TYPES.EMPTY || isReturningToPrevious) {
            // 检查目标位置是否为水方块，如果是，则不能移动
            const targetBlockType = gameState.board[newY][newX];
            if (targetBlockType === BLOCK_TYPES.WATER) {
                return;
            }
            
            // 如果游戏还没有开始，标记为已开始并启动计时器
            if (!gameState.hasStarted) {
                gameState.hasStarted = true;
                startTimer();
            }
            
            // 保存当前位置为上一个位置（只有当当前位置是空方块时才保存）
            if (currentBlockType === BLOCK_TYPES.EMPTY) {
                gameState.previousPosition = { x: gameState.playerPosition.x, y: gameState.playerPosition.y };
            }
            
            // 移动到目标位置
            gameState.playerPosition.x = newX;
            gameState.playerPosition.y = newY;
            renderBoard();
            
            // 如果是原路返回，清除上一个位置记录
            if (isReturningToPrevious) {
                gameState.previousPosition = null;
            }
            
            // 玩家移动后，怪物也移动
            moveMonsters();
        } else {
            // 如果当前位置不是空方块且不是原路返回，不能移动
            return;
        }
    }
}

// 挖掘方块
function mineBlock() {
    // 如果游戏还没有开始，标记为已开始并启动计时器
    if (!gameState.hasStarted) {
        gameState.hasStarted = true;
        startTimer();
    }
    
    const x = gameState.playerPosition.x;
    const y = gameState.playerPosition.y;
    
    // 获取当前方块类型
    const blockType = gameState.board[y][x];
    
    // 生成唯一的位置键
    const positionKey = `${x},${y}`;
    
    // 检查钻石矿是否已被挖掘一次
    if (blockType === BLOCK_TYPES.DIAMOND_ORE) {
        if (!gameState.blockStates[positionKey]) {
            // 第一次挖掘钻石矿，设置为半挖掘状态
            gameState.blockStates[positionKey] = { type: BLOCK_TYPES.DIAMOND_ORE, hitsLeft: 1 };
            // 更新UI显示半挖掘状态
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.classList.add('partially-mined');
            }
            return; // 返回，不执行后续操作
        } else if (gameState.blockStates[positionKey].hitsLeft === 1) {
            // 第二次挖掘，钻石矿被完全挖掉
            gameState.inventory.diamond++;
            // 有一定几率获得钻石剑
            if (Math.random() < 0.1 && gameState.inventory.diamondSword < 3) { // 最多3把钻石剑
                gameState.inventory.diamondSword++;
                // 播放获得物品音效
                playItemPickupSound();
            }
            // 删除方块状态
            delete gameState.blockStates[positionKey];
        }
    }
    // 如果不是钻石矿，按原逻辑处理
    else {
        // 根据方块类型增加物品
        switch (blockType) {
            case BLOCK_TYPES.TNT:
            gameState.inventory.tnt++;
            // 挖掘TNT会减少生命值
            gameState.health -= 4;
            updateHealthDisplay();
            // 播放受伤声音
            playHurtSound();
            if (gameState.health <= 0) {
                // 立即停止计时器
                if (gameState.timer) {
                    clearInterval(gameState.timer);
                    gameState.timer = null;
                }
                // 播放死亡音效（异步）
                playDeathSound();
                setTimeout(() => {
                    showCustomDialog("游戏结束", "你被TNT炸死了！", () => {
                        resetGame();
                    });
                }, 500);
                return;
            }
            break;
            case BLOCK_TYPES.ANTIMATTER_TNT:
            gameState.inventory.antimatterTnt++;
            // 挖掘反物质TNT会减少生命值
            gameState.health -= 20;
            updateHealthDisplay();
            // 播放受伤声音
            playHurtSound();
            if (gameState.health <= 0) {
                // 立即停止计时器
                if (gameState.timer) {
                    clearInterval(gameState.timer);
                    gameState.timer = null;
                }
                // 播放死亡音效（异步）
                playDeathSound();
                setTimeout(() => {
                    showCustomDialog("游戏结束", "你被反物质TNT炸死了！", () => {
                        resetGame();
                    });
                }, 500);
                return;
            }
            break;
            case BLOCK_TYPES.WATER:
                // 不显示提示框
                return;
            case BLOCK_TYPES.GLASS:
                // 玻璃不再分解为石头
                break;
            case BLOCK_TYPES.GOLDEN_APPLE:
                gameState.inventory.goldenApple++;
                // 挖到金苹果增加生命值
                gameState.health += 5;
                updateHealthDisplay();
                // 播放获得物品音效
                playItemPickupSound();
                break;
            case BLOCK_TYPES.MONSTER:
            case BLOCK_TYPES.ZOMBIE:
                if (gameState.hasDiamondSword) {
                    // 有钻石剑可以杀死怪物
                    // 播放怪物死亡音效
                    playMonsterDeathSound();
                    // 检查是否所有怪物都被消灭
                    if (checkAllMonstersEliminated()) {
                        showVictory();
                        return;
                    }
                } else {
                    // 没有武器会被怪物攻击，减少生命值
                    gameState.health -= 3; // 受攻击减少3点生命值
                    updateHealthDisplay();
                    // 添加攻击动画效果
                    const playerCell = document.querySelector(`.cell[data-x="${gameState.playerPosition.x}"][data-y="${gameState.playerPosition.y}"]`);
                    if (playerCell) {
                        playerCell.style.animation = 'attackFlash 0.5s';
                        setTimeout(() => {
                            playerCell.style.animation = '';
                        }, 500);
                    }
                    // 播放受伤声音
                    playHurtSound();
                    if (gameState.health <= 0) {
                        // 立即停止计时器
                        if (gameState.timer) {
                            clearInterval(gameState.timer);
                            gameState.timer = null;
                        }
                        // 播放死亡音效（异步）
                        playDeathSound();
                        setTimeout(() => {
                            showCustomDialog("游戏结束", "你被怪物攻击多次，生命值耗尽！", () => {
                                resetGame();
                            });
                        }, 500);
                        return;
                    }
                }
                break;
            case BLOCK_TYPES.LAVA:
                // 立即停止计时器
                if (gameState.timer) {
                    clearInterval(gameState.timer);
                    gameState.timer = null;
                }
                // 播放死亡音效（异步）
                playDeathSound();
                setTimeout(() => {
                    showCustomDialog("游戏结束", "你被岩浆烧死了！", () => {
                        resetGame();
                    });
                }, 500);
                return; // 立即返回，不执行后续逻辑
                break;
            case BLOCK_TYPES.EMPTY: // 如果当前位置已经是空方块，不显示任何提示
                return;
        }
    }
    
    // 设置为空方块
    gameState.board[y][x] = BLOCK_TYPES.EMPTY;
    
    // 更新显示
    updateStats();
    renderBoard();
}

// 处理键盘按键
function handleKeyPress(event) {
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            movePlayer(0, -1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            movePlayer(1, 0);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            movePlayer(0, 1);
            break;
        case ' ':
            mineBlock();
            event.preventDefault(); // 阻止空格键滚动页面
            break;
    }
}

// 放置方块
// 怪物自主移动和攻击玩家
function moveMonsters() {
    // 遍历整个游戏板
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 检查是否是怪物
            if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE].includes(gameState.board[y][x])) {
                // 计算怪物与玩家的距离
                const dx = gameState.playerPosition.x - x;
                const dy = gameState.playerPosition.y - y;
                const distance = Math.abs(dx) + Math.abs(dy);
                
                // 如果怪物在玩家附近，尝试向玩家移动
                if (distance <= 5) {
                    // 决定移动方向（优先向玩家靠近的方向）
                    let moveX = 0;
                    let moveY = 0;
                    
                    if (Math.abs(dx) > Math.abs(dy)) {
                        // 优先在x轴上移动
                        moveX = dx > 0 ? 1 : -1;
                    } else {
                        // 优先在y轴上移动
                        moveY = dy > 0 ? 1 : -1;
                    }
                    
                    // 检查目标位置是否可以移动
                    const targetX = x + moveX;
                    const targetY = y + moveY;
                    
                    // 检查边界和目标位置是否为空
                    if (targetX >= 0 && targetX < BOARD_SIZE && targetY >= 0 && targetY < BOARD_SIZE) {
                        // 如果目标位置是玩家位置，则攻击玩家
                if (targetX === gameState.playerPosition.x && targetY === gameState.playerPosition.y) {
                    // 攻击玩家
                    gameState.health -= 3;
                    updateHealthDisplay();
                    // 添加攻击动画效果
                    const playerCell = document.querySelector(`.cell[data-x="${gameState.playerPosition.x}"][data-y="${gameState.playerPosition.y}"]`);
                    if (playerCell) {
                        playerCell.style.animation = 'attackFlash 0.5s';
                        setTimeout(() => {
                            playerCell.style.animation = '';
                        }, 500);
                    }
                    // 播放受伤声音
                    playHurtSound();
                    if (gameState.health <= 0) {
                        // 播放死亡音效
                        playDeathSound();
                        setTimeout(() => {
                            showCustomDialog("Minecraft矿洞探险", "你被怪物攻击多次，生命值耗尽！游戏结束！", resetGame, false);
                            resetGame();
                        }, 500);
                        return;
                    }
                } 
                        // 如果目标位置是空的，则移动怪物
                        else if (gameState.board[targetY][targetX] === BLOCK_TYPES.EMPTY) {
                            gameState.board[targetY][targetX] = gameState.board[y][x];
                            gameState.board[y][x] = BLOCK_TYPES.EMPTY;
                        }
                    }
                }
            }
        }
    }
    
    // 检查是否所有怪物都被消灭
    if (checkAllMonstersEliminated()) {
        setTimeout(() => {
            showVictory();
        }, 100); // 稍微延迟一下，确保渲染完成
        return;
    }
    
    // 更新显示
    renderBoard();
}

// TNT爆炸效果
function explodeTNT(x, y) {
    // 播放爆炸声音
    playExplosionSound();
    
    // 添加爆炸动画效果
    const explosionCells = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            // 检查边界
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                const cell = document.querySelector(`.cell[data-x="${nx}"][data-y="${ny}"]`);
                if (cell) {
                    // 添加爆炸动画类
                    cell.style.animation = 'tntExplosion 0.5s';
                    explosionCells.push(cell);
                }
            }
        }
    }
    
    // 短暂延迟后处理爆炸效果
    setTimeout(() => {
        // 清除以(x,y)为中心的3x3区域
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                // 检查边界
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    // 不要清除玩家位置
                    if (nx !== gameState.playerPosition.x || ny !== gameState.playerPosition.y) {
                        // 如果是怪物，直接清除
                        if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE].includes(gameState.board[ny][nx])) {
                            gameState.board[ny][nx] = BLOCK_TYPES.EMPTY;
                        }
                        // 如果是其他方块，有一定几率清除
                        else if (Math.random() < 0.7) {
                            gameState.board[ny][nx] = BLOCK_TYPES.EMPTY;
                        }
                    }
                }
            }
        }
        
        // 移除动画效果
        explosionCells.forEach(cell => {
            cell.style.animation = '';
        });
        
        // 检查是否所有怪物都被消灭
        if (checkAllMonstersEliminated()) {
            setTimeout(() => {
                showVictory();
            }, 100); // 稍微延迟一下，确保渲染完成
            return;
        }
        
        // 减少TNT数量
        if (gameState.inventory.tnt > 0) {
            gameState.inventory.tnt--;
        }
        
        // 播放TNT爆炸音效
        playExplosionSound();
        
        // 重新渲染游戏板
        renderBoard();
    }, 500);
}

// 反物质TNT爆炸效果
function explodeAntiMatterTNT(x, y) {
    // 播放更强的爆炸声音
    playLargerExplosionSound();
    
    // 添加更大范围的爆炸动画效果
    const explosionCells = [];
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            // 检查边界
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                const cell = document.querySelector(`.cell[data-x="${nx}"][data-y="${ny}"]`);
                if (cell) {
                    // 添加更强的爆炸动画类
                    cell.style.animation = 'antimatterExplosion 0.7s';
                    explosionCells.push(cell);
                }
            }
        }
    }
    
    // 短暂延迟后处理爆炸效果
    setTimeout(() => {
        // 清除以(x,y)为中心的5x5区域
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                // 检查边界
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    // 不要清除玩家位置
                    if (nx !== gameState.playerPosition.x || ny !== gameState.playerPosition.y) {
                        // 如果是怪物，直接清除
                        if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE].includes(gameState.board[ny][nx])) {
                            gameState.board[ny][nx] = BLOCK_TYPES.EMPTY;
                        }
                        // 如果是其他方块，有一定几率清除
                        else if (Math.random() < 0.9) {
                            gameState.board[ny][nx] = BLOCK_TYPES.EMPTY;
                        }
                    } else {
                        // 玩家位置，造成20点伤害
                        gameState.health -= 20;
                        updateHealthDisplay();
                        // 播放受伤声音
                        playHurtSound();
                        if (gameState.health <= 0) {
                            // 播放死亡音效
                            playDeathSound();
                            setTimeout(() => {
                                showCustomDialog("Minecraft矿洞探险", "你被反物质TNT炸死了！游戏结束！", resetGame, false);
                                resetGame();
                            }, 500);
                            return;
                        }
                    }
                }
            }
        }
        
        // 移除动画效果
        explosionCells.forEach(cell => {
            cell.style.animation = '';
        });
        
        // 检查是否所有怪物都被消灭
        if (checkAllMonstersEliminated()) {
            setTimeout(() => {
                showVictory();
            }, 100); // 稍微延迟一下，确保渲染完成
            return;
        }
        
        // 减少反物质TNT数量
        if (gameState.inventory.antimatterTnt > 0) {
            gameState.inventory.antimatterTnt--;
        }
        
        // 播放更大爆炸音效
        playLargerExplosionSound();
        
        // 重新渲染游戏板
        renderBoard();
    }, 700);
}

// 设置帮助弹窗
function setupHelpModal() {
    const helpToggle = document.getElementById('helpToggle');
    const helpModal = document.getElementById('helpModal');
    const closeHelp = document.getElementById('closeHelp');
    
    if (!helpToggle || !helpModal || !closeHelp) {
        console.error('帮助弹窗元素未找到');
        return;
    }
    
    // 打开帮助弹窗
    helpToggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('帮助按钮被点击');
        helpModal.classList.add('show');
        helpModal.style.display = 'flex';
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
    });
    
    // 触摸事件支持
    helpToggle.addEventListener('touchstart', (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('帮助按钮被触摸');
        helpModal.classList.add('show');
        helpModal.style.display = 'flex';
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
    }, { passive: false });
    
    // 关闭帮助弹窗
    closeHelp.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeHelpModal();
    });
    
    closeHelp.addEventListener('touchstart', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeHelpModal();
    }, { passive: false });
    
    // 点击背景关闭弹窗
    helpModal.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            event.preventDefault();
            event.stopPropagation();
            closeHelpModal();
        }
    });
    
    // 触摸背景关闭弹窗
    helpModal.addEventListener('touchstart', (event) => {
        if (event.target === helpModal) {
            event.preventDefault();
            event.stopPropagation();
            closeHelpModal();
        }
    }, { passive: false });
    
    // ESC键关闭弹窗
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && helpModal.classList.contains('show')) {
            event.preventDefault();
            closeHelpModal();
        }
    });
}

// 关闭帮助弹窗
function closeHelpModal() {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
        helpModal.classList.remove('show');
        helpModal.style.display = 'none';
        // 恢复背景滚动
        document.body.style.overflow = '';
    }
}

// 检查所有怪物是否被消灭
function checkAllMonstersEliminated() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE].includes(gameState.board[y][x])) {
                return false; // 如果还有怪物，返回false
            }
        }
    }
    return true; // 没有怪物了，返回true
}

// 播放胜利声音
function playVictorySound() {
    // 使用setTimeout确保异步播放，不阻塞主线程
    setTimeout(() => {
        try {
            // 检查浏览器是否支持Web Audio API
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 2.0; // 持续时间
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);

            // 生成欢快的音调序列 (C4, E4, G4, C5, E5)
            const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25];
            const noteDuration = 0.3; // 每个音符的持续时间
            const noteFrames = Math.floor(noteDuration * sampleRate);

            for (let noteIndex = 0; noteIndex < frequencies.length; noteIndex++) {
                const startFrame = noteIndex * noteFrames;
                const endFrame = Math.min(startFrame + noteFrames, numFrames);
                const frequency = frequencies[noteIndex];

                for (let i = startFrame; i < endFrame; i++) {
                    const t = (i - startFrame) / sampleRate;
                    // 生成带有衰减的正弦波
                    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 2);
                }
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.start();
            }
        } catch (e) {
            // 如果声音播放失败，不显示错误
            console.log("无法播放声音: ", e);
        }
    }, 0); // 立即异步执行
}

// 显示胜利信息
function showVictory() {
    // 检查是否已经获胜，防止重复调用
    if (gameState.hasWon) {
        return;
    }
    
    // 设置获胜标志
    gameState.hasWon = true;
    
    // 立即停止计时器
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
    
    // 播放胜利声音（异步）
    playVictorySound();
    
    // 计算并检查是否打破纪录
    const gameTime = calculateGameTime();
    let isNewRecord = false;
    let message = "你消灭了所有怪物，获得了胜利！";
    
    if (gameState.bestTime === null || gameTime < gameState.bestTime) {
        gameState.bestTime = gameTime;
        saveBestTime();
        isNewRecord = true;
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        message = `🎉 新纪录！用时 ${minutes}:${seconds < 10 ? '0' : ''}${seconds} 消灭所有怪物！`;
    }
    
    // 延迟显示提示框，让音乐先播放
    setTimeout(() => {
        // 再次检查获胜状态，以防在延迟期间被其他事件重复触发
        if (gameState.hasWon) {
            // 使用自定义弹窗替代alert
            showCustomDialog("恭喜胜利！", message + "是否重新开始新游戏？", () => {
                resetGame();
            });
        }
    }, 500); // 延迟0.5秒，给短暂的音乐播放时间
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    document.getElementById('timerCount').textContent = timeString;
    
    // 根据剩余时间改变颜色以提醒玩家
    const timerElement = document.getElementById('timerCount');
    if (gameState.timeLeft <= 10) {
        timerElement.style.color = '#ff3333'; // 红色 - 非常紧急
        timerElement.style.fontWeight = 'bold';
        timerElement.style.textShadow = '0 0 5px rgba(255, 0, 0, 0.5)';
    } else if (gameState.timeLeft <= 30) {
        timerElement.style.color = '#ff9900'; // 橙色 - 紧急
        timerElement.style.fontWeight = 'bold';
        timerElement.style.textShadow = '0 0 3px rgba(255, 153, 0, 0.3)';
    } else {
        timerElement.style.color = '#4CAF50'; // 绿色 - 正常
        timerElement.style.fontWeight = 'bold';
        timerElement.style.textShadow = '0 0 3px rgba(76, 175, 80, 0.3)';
    }
}

// 开始计时器
function startTimer() {
    // 记录游戏开始时间
    gameState.gameStartTime = Date.now();
    
    // 根据难度设置时间
    const difficultyConfig = DIFFICULTY_LEVELS[gameState.difficulty.toUpperCase()];
    gameState.timeLeft = difficultyConfig.timeLimit;
    updateTimerDisplay();
    
    // 清除任何现有的计时器
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    // 开始新的计时器
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            // 时间到了，游戏失败
            gameOverTimeout();
        }
    }, 1000);
}

// 时间到，游戏失败
function gameOverTimeout() {
    // 立即停止计时器
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
    
    // 播放死亡音效（异步）
    playDeathSound();
    
    // 延迟显示失败提示
    setTimeout(() => {
        showCustomDialog("Minecraft矿洞探险", "时间到！你没有在规定时间内消灭所有怪物，游戏失败！", resetGame, false);
    }, 500);
}

// 开始游戏 - not needed anymore since game starts automatically

// 重置游戏
function resetGame() {
    // 清除计时器
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
    
    // 重置游戏开始状态
    gameState.hasStarted = false;
    
    gameState.playerPosition = { x: 7, y: 7 };
    gameState.inventory = { 
        diamond: 0,
        tnt: 0,
        antimatterTnt: 0,
        diamondSword: 1, // 重新开始时初始拥有钻石剑
        goldenApple: 0
    };
    gameState.hasDiamondSword = true;
    gameState.health = 10; // 重置生命值为10点
    gameState.blockStates = {}; // 重置方块状态
    
    // 根据难度设置时间
    const difficultyConfig = DIFFICULTY_LEVELS[gameState.difficulty.toUpperCase()];
    gameState.timeLeft = difficultyConfig.timeLimit;
    
    gameState.hasWon = false; // 重置获胜标志
    gameState.gameStartTime = 0; // 重置游戏开始时间
    createBoard();
    // 确保玩家初始位置是空方块，以便能够移动
    gameState.board[7][7] = BLOCK_TYPES.EMPTY;
    renderBoard();
    updateStats();
    updateTimerDisplay(); // 更新计时器显示
    updateBestTimeDisplay(); // 更新最佳纪录显示
    
    // Show controls since the start button is removed
    document.getElementById('mineBtn').style.display = 'inline-block';
    document.getElementById('moveUpBtn').style.display = 'inline-block';
    document.getElementById('moveLeftBtn').style.display = 'inline-block';
    document.getElementById('moveRightBtn').style.display = 'inline-block';
    document.getElementById('moveDownBtn').style.display = 'inline-block';
    document.getElementById('exitBtn').style.display = 'inline-block';
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', initGame);

// 播放爆炸声音
function playExplosionSound() {
    try {
        // 检查浏览器是否支持Web Audio API
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 0.5; // 持续时间
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);
            
            // 生成爆炸声波形
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                // 生成一个带有噪音和衰减的声音
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 5) * (1 - t / duration);
            }
            
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
        // 如果声音播放失败，不显示错误
        console.log("无法播放声音: ", e);
    }
}

// 播放更大的爆炸声音
function playLargerExplosionSound() {
    try {
        // 检查浏览器是否支持Web Audio API
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 0.8; // 更长的持续时间
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);
            
            // 生成更强的爆炸声波形
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                // 生成一个更响亮、更持久的爆炸声
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3) * (1 - t / duration);
            }
            
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
        // 如果声音播放失败，不显示错误
        console.log("无法播放声音: ", e);
    }
}

// 退出游戏函数
function exitGame() {
    showCustomDialog('Minecraft矿洞探险', '确定要退出游戏吗？', () => {
        // 清除计时器
        if (gameState.timer) {
            clearInterval(gameState.timer);
            gameState.timer = null;
        }
        // 重置按钮 display states - since we removed start button, just hide all control buttons
        document.getElementById('mineBtn').style.display = 'none';
        document.getElementById('moveUpBtn').style.display = 'none';
        document.getElementById('moveLeftBtn').style.display = 'none';
        document.getElementById('moveRightBtn').style.display = 'none';
        document.getElementById('moveDownBtn').style.display = 'none';
        document.getElementById('exitBtn').style.display = 'none';
        window.close();
    });
}

// 播放获得物品声音
function playItemPickupSound() {
    try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 0.5;
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);

            // 生成上升音调
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                const frequency = 200 + t * 200; // 频率上升
                data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 2);
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
        console.log("无法播放获得物品声音: ", e);
    }
}

// 播放怪物死亡声音
function playMonsterDeathSound() {
    try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 0.6;
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);

            // 生成下降音调
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                const frequency = 300 - t * 150; // 频率下降
                data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 4);
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
        console.log("无法播放怪物死亡声音: ", e);
    }
}

// 播放错误声音
function playErrorSound() {
    try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 0.3;
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);

            // 生成下降音调
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                const frequency = 200 - t * 100; // 频率下降
                data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 5);
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
        console.log("无法播放错误声音: ", e);
    }
}

// 播放受伤声音
function playHurtSound() {
    try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 0.3;
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);

            // 生成低频噪音
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 10);
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
        console.log("无法播放受伤声音: ", e);
    }
}

// 播放死亡声音
function playDeathSound() {
    // 使用setTimeout确保异步播放，不阻塞主线程
    setTimeout(() => {
        try {
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const audioCtx = new (AudioContext || webkitAudioContext)();
            const duration = 1.0;
            const sampleRate = audioCtx.sampleRate;
            const numFrames = duration * sampleRate;
            const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
            const data = buffer.getChannelData(0);

            // 生成低频音调
            for (let i = 0; i < numFrames; i++) {
                const t = i / sampleRate;
                const frequency = 150 - t * 100; // 频率递减
                data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 3);
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }
    } catch (e) {
            console.log("无法播放死亡声音: ", e);
        }
    }, 0); // 立即异步执行
}

// 更改游戏难度
function changeDifficulty(difficulty) {
    // 更新游戏状态
    gameState.difficulty = difficulty;
    
    // 更新按钮的激活状态
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`difficulty-${difficulty}`).classList.add('active');
    
    // 重置游戏以应用新难度
    resetGame();
}

// 加载最佳纪录
function loadBestTime() {
    const saved = localStorage.getItem('minecraftBestTime');
    if (saved) {
        gameState.bestTime = parseInt(saved);
    }
}

// 保存最佳纪录
function saveBestTime() {
    if (gameState.bestTime !== null) {
        localStorage.setItem('minecraftBestTime', gameState.bestTime.toString());
    }
}

// 更新最佳纪录显示
function updateBestTimeDisplay() {
    const bestTimeElement = document.getElementById('bestTime');
    if (bestTimeElement) {
        if (gameState.bestTime !== null) {
            const minutes = Math.floor(gameState.bestTime / 60);
            const seconds = gameState.bestTime % 60;
            bestTimeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        } else {
            bestTimeElement.textContent = '--:--';
        }
    }
}

// 计算游戏用时
function calculateGameTime() {
    if (gameState.gameStartTime > 0) {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - gameState.gameStartTime) / 1000);
        const difficultyConfig = DIFFICULTY_LEVELS[gameState.difficulty.toUpperCase()];
        const totalTime = difficultyConfig ? difficultyConfig.timeLimit : 180;
        return totalTime - elapsedSeconds;
    }
    return 0;
}