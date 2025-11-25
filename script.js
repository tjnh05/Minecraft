// 游戏配置
const BOARD_SIZE = 15;
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
        totalMonsters: 13 // 困难模式下怪物总数为13个
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
    CREEPER: 'creeper',
    GLASS: 'glass',
    DIRT: 'dirt',
    GOLDEN_APPLE: 'golden-apple'
};

// 生物类型
const MOB_TYPES = {
    MONSTER: 'monster',
    ZOMBIE: 'zombie',
    CREEPER: 'creeper'
};

// 游戏状态
let gameState = {
    board: [],
    playerPosition: { x: 7, y: 7 },
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
    hasWon: false // 标记游戏是否已获胜
};

// 初始化游戏
function initGame() {
    // 设置难度选择按钮事件监听器
    document.getElementById('difficulty-easy').addEventListener('click', () => changeDifficulty('easy'));
    document.getElementById('difficulty-medium').addEventListener('click', () => changeDifficulty('medium'));
    document.getElementById('difficulty-hard').addEventListener('click', () => changeDifficulty('hard'));
    
    createBoard();
    // 确保玩家初始位置是空方块，以便能够移动
    gameState.board[7][7] = BLOCK_TYPES.EMPTY;
    renderBoard();
    updateStats();
    updateTimerDisplay(); // 初始化计时器显示
    
    // 绑定事件
    document.getElementById('mineBtn').addEventListener('click', mineBlock);
    document.getElementById('moveUpBtn').addEventListener('click', () => movePlayer(0, -1));
    document.getElementById('moveLeftBtn').addEventListener('click', () => movePlayer(-1, 0));
    document.getElementById('moveRightBtn').addEventListener('click', () => movePlayer(1, 0));
    document.getElementById('moveDownBtn').addEventListener('click', () => movePlayer(0, 1));
    document.getElementById('exitBtn').addEventListener('click', exitGame);
    
    // 添加键盘控制
    document.addEventListener('keydown', handleKeyPress);
    
    // Show controls since the start button is removed - controls are available immediately
    document.getElementById('mineBtn').style.display = 'inline-block';
    document.getElementById('moveUpBtn').style.display = 'inline-block';
    document.getElementById('moveLeftBtn').style.display = 'inline-block';
    document.getElementById('moveRightBtn').style.display = 'inline-block';
    document.getElementById('moveDownBtn').style.display = 'inline-block';
    document.getElementById('exitBtn').style.display = 'inline-block';
}

// 创建游戏板
function createBoard() {
    gameState.board = [];
    
    // 根据难度获取金苹果减少比例和怪物总数
    const difficultyConfig = DIFFICULTY_LEVELS[gameState.difficulty.toUpperCase()];
    const goldenAppleReduction = difficultyConfig ? difficultyConfig.goldenAppleReduction : 1;
    const totalMonsters = difficultyConfig ? difficultyConfig.totalMonsters : 10;
    
    // 初始化游戏板
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 在中心附近生成玩家安全区域
            if (Math.abs(x - 7) <= 2 && Math.abs(y - 7) <= 2) {
                row.push(BLOCK_TYPES.STONE);
            } else {
                // 初始化为石头
                row.push(BLOCK_TYPES.STONE);
            }
        }
        gameState.board.push(row);
    }
    
    // 随机放置怪物，总数由难度决定
    let monstersPlaced = 0;
    while (monstersPlaced < totalMonsters) {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        
        // 确保不在玩家安全区域内放置怪物
        if (Math.abs(x - 7) <= 2 && Math.abs(y - 7) <= 2) {
            continue;
        }
        
        // 确保该位置不是空方块或已经放置了怪物
        if (gameState.board[y][x] === BLOCK_TYPES.STONE) {
            // 随机选择怪物类型
            const mobRand = Math.random();
            let monsterType;
            if (mobRand < 0.33) {
                monsterType = BLOCK_TYPES.MONSTER;
            } else if (mobRand < 0.67) {
                monsterType = BLOCK_TYPES.ZOMBIE;
            } else {
                monsterType = BLOCK_TYPES.CREEPER;
            }
            
            gameState.board[y][x] = monsterType;
            monstersPlaced++;
        }
    }
    
    // 填充其他方块
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 跳过玩家安全区域和已放置怪物的位置
            if ((Math.abs(x - 7) <= 2 && Math.abs(y - 7) <= 2) || 
                [BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE, BLOCK_TYPES.CREEPER].includes(gameState.board[y][x])) {
                continue;
            }
            
            // 根据位置生成不同的方块
            const rand = Math.random();
            
            if (y < 3) {
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
            } else if (y < 8) {
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
            } else if (y < 12) {
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

// 渲染游戏板
function renderBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = `cell ${gameState.board[y][x]}`;
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // 显示玩家位置
            if (x === gameState.playerPosition.x && y === gameState.playerPosition.y) {
                cell.classList.add('player');
            }
            
            gameBoard.appendChild(cell);
        }
    }
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
        if (currentBlockType === BLOCK_TYPES.EMPTY) {
            // 检查目标位置是否为水方块，如果是，则不能移动
            const targetBlockType = gameState.board[newY][newX];
            if (targetBlockType === BLOCK_TYPES.WATER) {
                return;
            }
            // 可以移动到目标位置（除了水方块外的任何方块）
            gameState.playerPosition.x = newX;
            gameState.playerPosition.y = newY;
            renderBoard();
            // 玩家移动后，怪物也移动
            moveMonsters();
        } else {
            // 如果当前位置不是空方块，不能移动
            return;
        }
    }
}

// 挖掘方块
function mineBlock() {
    // 如果计时器还没有启动，则启动计时器
    if (!gameState.timer) {
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
                // 播放死亡音效
                playDeathSound();
                setTimeout(() => {
                    alert("你被TNT炸死了！游戏结束！");
                    resetGame();
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
                // 播放死亡音效
                playDeathSound();
                setTimeout(() => {
                    alert("你被反物质TNT炸死了！游戏结束！");
                    resetGame();
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
            case BLOCK_TYPES.CREEPER:
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
                        // 播放死亡音效
                        playDeathSound();
                        setTimeout(() => {
                            alert("你被怪物攻击多次，生命值耗尽！游戏结束！");
                            resetGame();
                        }, 500);
                        return;
                    }
                }
                break;
            case BLOCK_TYPES.LAVA:
                gameState.health -= 2; // 岩浆伤害更高
                updateHealthDisplay();
                // 播放受伤声音
                playHurtSound();
                if (gameState.health <= 0) {
                    // 播放死亡音效
                    playDeathSound();
                    setTimeout(() => {
                        alert("你被岩浆烧死了！游戏结束！");
                        resetGame();
                    }, 500);
                    return;
                }
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
            if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE, BLOCK_TYPES.CREEPER].includes(gameState.board[y][x])) {
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
                            alert("你被怪物攻击多次，生命值耗尽！游戏结束！");
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
                        if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE, BLOCK_TYPES.CREEPER].includes(gameState.board[ny][nx])) {
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
                        if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE, BLOCK_TYPES.CREEPER].includes(gameState.board[ny][nx])) {
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
                                alert("你被反物质TNT炸死了！游戏结束！");
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

// 检查是否所有怪物都被消灭
function checkAllMonstersEliminated() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if ([BLOCK_TYPES.MONSTER, BLOCK_TYPES.ZOMBIE, BLOCK_TYPES.CREEPER].includes(gameState.board[y][x])) {
                return false; // 如果还有怪物，返回false
            }
        }
    }
    return true; // 没有怪物了，返回true
}

// 播放胜利声音
function playVictorySound() {
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
}

// 显示胜利信息
function showVictory() {
    // 检查是否已经获胜，防止重复调用
    if (gameState.hasWon) {
        return;
    }
    
    // 设置获胜标志
    gameState.hasWon = true;
    
    // 播放胜利声音
    playVictorySound();
    
    // 延迟显示提示框，让音乐先播放
    setTimeout(() => {
        alert("恭喜！你消灭了所有怪物，获得了胜利！");
        // 可以选择重置游戏或显示其他胜利画面
        if (confirm('游戏胜利！是否重新开始新游戏？')) {
            resetGame();
        }
    }, 2000); // 延迟2秒，让音乐有足够时间播放
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    document.getElementById('timerCount').textContent = timeString;
    
    // 当时间少于30秒时，让时间显示变红以提醒玩家
    const timerElement = document.getElementById('timerCount');
    if (gameState.timeLeft <= 30) {
        timerElement.style.color = 'red';
        timerElement.style.fontWeight = 'bold';
    } else {
        timerElement.style.color = 'initial';
        timerElement.style.fontWeight = 'initial';
    }
}

// 开始计时器
function startTimer() {
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
    // 播放死亡音效
    playDeathSound();
    setTimeout(() => {
        alert("时间到！你没有在规定时间内消灭所有怪物，游戏失败！");
        resetGame();
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
    createBoard();
    // 确保玩家初始位置是空方块，以便能够移动
    gameState.board[7][7] = BLOCK_TYPES.EMPTY;
    renderBoard();
    updateStats();
    updateTimerDisplay(); // 更新计时器显示
    
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
    if (confirm('确定要退出游戏吗？')) {
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
    }
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