// 游戏配置
const BOARD_SIZE = 15;
const BLOCK_TYPES = {
    STONE: 'stone',
    IRON_ORE: 'iron-ore',
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
    WOOL: 'wool',
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
        iron: 0,
        diamond: 0,
        tnt: 0,
        antimatterTnt: 0,
        diamondSword: 1, // 初始就有一把钻石剑
        wool: 0,
        goldenApple: 0
    },
    hasDiamondSword: true, // 初始就拥有钻石剑
    health: 10, // 玩家初始生命值调整为10点
    // 用于跟踪方块状态
    blockStates: {}, // 存储需要多次点击的方块状态
    timer: null, // 计时器
    timeLeft: 180 // 剩余时间（秒），3分钟=180秒
};

// 初始化游戏
function initGame() {
    createBoard();
    renderBoard();
    updateStats();
    updateTimerDisplay(); // 初始化计时器显示
    
    // 绑定事件
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('mineBtn').addEventListener('click', mineBlock);
    document.getElementById('moveUpBtn').addEventListener('click', () => movePlayer(0, -1));
    document.getElementById('moveLeftBtn').addEventListener('click', () => movePlayer(-1, 0));
    document.getElementById('moveRightBtn').addEventListener('click', () => movePlayer(1, 0));
    document.getElementById('moveDownBtn').addEventListener('click', () => movePlayer(0, 1));
    document.getElementById('exitBtn').addEventListener('click', exitGame);
    
    // 添加键盘控制
    document.addEventListener('keydown', handleKeyPress);
    
    // 添加鼠标点击放置方块的功能
    document.getElementById('gameBoard').addEventListener('click', placeBlock);
}

// 创建游戏板
function createBoard() {
    gameState.board = [];
    
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 在中心附近生成玩家安全区域
            if (Math.abs(x - 7) <= 2 && Math.abs(y - 7) <= 2) {
                row.push(BLOCK_TYPES.STONE);
                continue;
            }
            
            // 根据位置生成不同的方块
            const rand = Math.random();
            
            if (y < 3) {
                // 顶层多为石头、木头、泥土、玻璃
                if (rand < 0.3) {
                    row.push(BLOCK_TYPES.STONE);
                } else if (rand < 0.5) {
                    row.push(BLOCK_TYPES.WOOD);
                } else if (rand < 0.65) {
                    row.push(BLOCK_TYPES.DIRT);
                } else if (rand < 0.8) {
                    row.push(BLOCK_TYPES.GLASS);
                } else if (rand < 0.9) {
                    row.push(BLOCK_TYPES.IRON_ORE);
                } else {
                    row.push(BLOCK_TYPES.GOLDEN_APPLE);
                }
            } else if (y < 8) {
                // 中层石头、铁矿石、木头、鹅卵石、泥土、羊毛
                if (rand < 0.2) {
                    row.push(BLOCK_TYPES.STONE);
                } else if (rand < 0.35) {
                    row.push(BLOCK_TYPES.WOOD);
                } else if (rand < 0.5) {
                    row.push(BLOCK_TYPES.COBBLESTONE);
                } else if (rand < 0.65) {
                    row.push(BLOCK_TYPES.DIRT);
                } else if (rand < 0.75) {
                    row.push(BLOCK_TYPES.WOOL);
                } else if (rand < 0.85) {
                    row.push(BLOCK_TYPES.IRON_ORE);
                } else if (rand < 0.9) {
                    row.push(BLOCK_TYPES.DIAMOND_ORE);
                } else {
                    row.push(BLOCK_TYPES.GOLDEN_APPLE);
                }
            } else if (y < 12) {
                // 深层铁矿石、钻石、TNT、水、玻璃、金苹果
                if (rand < 0.15) {
                    row.push(BLOCK_TYPES.STONE);
                } else if (rand < 0.3) {
                    row.push(BLOCK_TYPES.IRON_ORE);
                } else if (rand < 0.4) {
                    row.push(BLOCK_TYPES.DIAMOND_ORE);
                } else if (rand < 0.5) {
                    row.push(BLOCK_TYPES.TNT);
                } else if (rand < 0.55) {
                    row.push(BLOCK_TYPES.ANTIMATTER_TNT);
                } else if (rand < 0.65) {
                    row.push(BLOCK_TYPES.WATER);
                } else if (rand < 0.75) {
                    row.push(BLOCK_TYPES.GLASS);
                } else if (rand < 0.85) {
                    // 随机生成怪物
                    const mobRand = Math.random();
                    if (mobRand < 0.4) {
                        row.push(BLOCK_TYPES.MONSTER);
                    } else if (mobRand < 0.7) {
                        row.push(BLOCK_TYPES.ZOMBIE);
                    } else {
                        row.push(BLOCK_TYPES.CREEPER);
                    }
                } else if (rand < 0.95) {
                    row.push(BLOCK_TYPES.DIAMOND_ORE); // 额外的钻石
                } else {
                    row.push(BLOCK_TYPES.GOLDEN_APPLE);
                }
            } else {
                // 最深层加入岩浆、TNT和更多怪物
                if (rand < 0.1) {
                    row.push(BLOCK_TYPES.STONE);
                } else if (rand < 0.25) {
                    row.push(BLOCK_TYPES.IRON_ORE);
                } else if (rand < 0.4) {
                    row.push(BLOCK_TYPES.DIAMOND_ORE);
                } else if (rand < 0.55) {
                    row.push(BLOCK_TYPES.LAVA);
                } else if (rand < 0.65) {
                    row.push(BLOCK_TYPES.TNT);
                } else if (rand < 0.7) {
                    row.push(BLOCK_TYPES.ANTIMATTER_TNT);
                } else if (rand < 0.8) {
                    row.push(BLOCK_TYPES.GLASS);
                } else if (rand < 0.9) {
                    // 随机生成怪物
                    const mobRand = Math.random();
                    if (mobRand < 0.4) {
                        row.push(BLOCK_TYPES.MONSTER);
                    } else if (mobRand < 0.7) {
                        row.push(BLOCK_TYPES.ZOMBIE);
                    } else {
                        row.push(BLOCK_TYPES.CREEPER);
                    }
                } else {
                    row.push(BLOCK_TYPES.GOLDEN_APPLE);
                }
            }
        }
        gameState.board.push(row);
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
    document.getElementById('ironCount').textContent = gameState.inventory.iron;
    document.getElementById('diamondCount').textContent = gameState.inventory.diamond;
    
    // 添加新的资源统计
    document.getElementById('tntCount').textContent = gameState.inventory.tnt;
    document.getElementById('diamondSwordCount').textContent = gameState.inventory.diamondSword;
    document.getElementById('woolCount').textContent = gameState.inventory.wool || 0;
    document.getElementById('goldenAppleCount').textContent = gameState.inventory.goldenApple || 0;
    
    // 更新反物质TNT显示
    const antimatterTntElement = document.getElementById('antimatterTntCount');
    if (antimatterTntElement) {
        antimatterTntElement.textContent = gameState.inventory.antimatterTnt || 0;
    }
    
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
                alert("无法移动到水方块！");
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
            alert("当前位置有障碍物，无法移动！");
        }
    }
}

// 挖掘方块
function mineBlock() {
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
            alert("钻石矿需要再挖掘一次才能完全破碎！");
            return; // 返回，不执行后续操作
        } else if (gameState.blockStates[positionKey].hitsLeft === 1) {
            // 第二次挖掘，钻石矿被完全挖掉
            gameState.inventory.diamond++;
            // 有一定几率获得钻石剑
            if (Math.random() < 0.1 && gameState.inventory.diamondSword < 3) { // 最多3把钻石剑
                gameState.inventory.diamondSword++;
                alert("恭喜！你发现了一把钻石剑！");
            }
            // 删除方块状态
            delete gameState.blockStates[positionKey];
        }
    }
    // 如果不是钻石矿，按原逻辑处理
    else {
        // 根据方块类型增加物品
        switch (blockType) {
            case BLOCK_TYPES.IRON_ORE:
                gameState.inventory.iron++;
                break;
            case BLOCK_TYPES.TNT:
            gameState.inventory.tnt++;
            // 挖掘TNT会减少生命值
            gameState.health -= 4;
            updateHealthDisplay();
            alert(`哎呀！挖掘TNT时发生了爆炸！生命值减少4点。剩余生命值: ${gameState.health}`);
            if (gameState.health <= 0) {
                alert("你被TNT炸死了！游戏结束！");
                resetGame();
                return;
            }
            break;
            case BLOCK_TYPES.ANTIMATTER_TNT:
            gameState.inventory.antimatterTnt++;
            // 挖掘反物质TNT会减少生命值
            gameState.health -= 20;
            updateHealthDisplay();
            alert(`哎呀！挖掘反物质TNT时发生了剧烈爆炸！生命值减少20点。剩余生命值: ${gameState.health}`);
            if (gameState.health <= 0) {
                alert("你被反物质TNT炸死了！游戏结束！");
                resetGame();
                return;
            }
            break;
            case BLOCK_TYPES.WATER:
                // 不显示提示框
                return;
            case BLOCK_TYPES.GLASS:
                // 玻璃不再分解为石头
                break;
            case BLOCK_TYPES.WOOL:
                gameState.inventory.wool++;
                break;
            case BLOCK_TYPES.GOLDEN_APPLE:
                gameState.inventory.goldenApple++;
                // 挖到金苹果增加生命值
                gameState.health += 5;
                updateHealthDisplay();
                alert(`哇！你挖到了金苹果！生命值增加5点。当前生命值: ${gameState.health}`);
                break;
            case BLOCK_TYPES.MONSTER:
            case BLOCK_TYPES.ZOMBIE:
            case BLOCK_TYPES.CREEPER:
                if (gameState.hasDiamondSword) {
                    // 有钻石剑可以杀死怪物
                    alert("你用钻石剑杀死了怪物！");
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
                    alert(`你被怪物攻击了！生命值减少3点。剩余生命值: ${gameState.health}`);
                    if (gameState.health <= 0) {
                        alert("你被怪物攻击多次，生命值耗尽！游戏结束！");
                        resetGame();
                        return;
                    }
                }
                break;
            case BLOCK_TYPES.LAVA:
                gameState.health -= 2; // 岩浆伤害更高
                updateHealthDisplay();
                alert(`哎呀！你掉进了岩浆里！生命值减少。剩余生命值: ${gameState.health}`);
                if (gameState.health <= 0) {
                    alert("你被岩浆烧死了！游戏结束！");
                    resetGame();
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
function placeBlock(event) {
    // 检查点击的是否是空方块
    if (event.target.classList.contains('mined')) {
        const x = parseInt(event.target.dataset.x);
        const y = parseInt(event.target.dataset.y);
        
        // 检查玩家是否在相邻位置
        const dx = Math.abs(x - gameState.playerPosition.x);
        const dy = Math.abs(y - gameState.playerPosition.y);
        
        // 只有在玩家相邻时才能放置方块
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // 优先放置方块的顺序：铁矿石 > 钻石 > TNT > 反物质TNT
            if (gameState.inventory.iron > 0) {
                gameState.board[y][x] = BLOCK_TYPES.IRON_ORE;
                gameState.inventory.iron--;
            } else if (gameState.inventory.diamond > 0) {
                gameState.board[y][x] = BLOCK_TYPES.DIAMOND_ORE;
                gameState.inventory.diamond--;
                // 重新设置方块状态
                const positionKey = `${x},${y}`;
                gameState.blockStates[positionKey] = { type: BLOCK_TYPES.DIAMOND_ORE, hitsLeft: 1 };
            } else if (gameState.inventory.tnt > 0) {
                gameState.board[y][x] = BLOCK_TYPES.TNT;
                gameState.inventory.tnt--;
            } else if (gameState.inventory.antimatterTnt > 0) {
                gameState.board[y][x] = BLOCK_TYPES.ANTIMATTER_TNT;
                gameState.inventory.antimatterTnt--;
            } else {
                alert('你没有可放置的方块！');
                return;
            }
            
            // 更新显示
            updateStats();
            renderBoard();
        }
    }
}

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
                    alert(`你被怪物攻击了！生命值减少3点。剩余生命值: ${gameState.health}`);
                    if (gameState.health <= 0) {
                        alert("你被怪物攻击多次，生命值耗尽！游戏结束！");
                        resetGame();
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
        
        alert("TNT爆炸了！周围的方块被炸掉了！");
        
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
                        alert(`反物质TNT爆炸！你受到了20点伤害。剩余生命值: ${gameState.health}`);
                        if (gameState.health <= 0) {
                            alert("你被反物质TNT炸死了！游戏结束！");
                            resetGame();
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
        
        alert("反物质TNT爆炸了！周围的方块被炸掉了！");
        
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
    // 重置时间
    gameState.timeLeft = 180; // 3分钟
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
    alert("时间到！你没有在规定时间内消灭所有怪物，游戏失败！");
    resetGame();
}

// 开始游戏
function startGame() {
    // 重置游戏状态
    resetGame();
    
    // 开始计时器
    startTimer();
    
    // 显示控制按钮，隐藏开始按钮
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('mineBtn').style.display = 'inline-block';
    document.getElementById('moveUpBtn').style.display = 'inline-block';
    document.getElementById('moveLeftBtn').style.display = 'inline-block';
    document.getElementById('moveRightBtn').style.display = 'inline-block';
    document.getElementById('moveDownBtn').style.display = 'inline-block';
    document.getElementById('exitBtn').style.display = 'inline-block';
}

// 重置游戏
function resetGame() {
    // 清除计时器
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
    
    gameState.playerPosition = { x: 7, y: 7 };
    gameState.inventory = { 
        iron: 0, 
        diamond: 0,
        tnt: 0,
        antimatterTnt: 0,
        diamondSword: 1, // 重新开始时初始拥有钻石剑
        wool: 0,
        goldenApple: 0
    };
    gameState.hasDiamondSword = true;
    gameState.health = 10; // 重置生命值为10点
    gameState.blockStates = {}; // 重置方块状态
    gameState.timeLeft = 180; // 重置剩余时间为3分钟
    createBoard();
    // 确保玩家初始位置是空方块，以便能够移动
    gameState.board[7][7] = BLOCK_TYPES.EMPTY;
    renderBoard();
    updateStats();
    updateTimerDisplay(); // 更新计时器显示
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
        // 重置按钮显示状态
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('mineBtn').style.display = 'none';
        document.getElementById('moveUpBtn').style.display = 'none';
        document.getElementById('moveLeftBtn').style.display = 'none';
        document.getElementById('moveRightBtn').style.display = 'none';
        document.getElementById('moveDownBtn').style.display = 'none';
        document.getElementById('exitBtn').style.display = 'none';
        window.close();
    }
}