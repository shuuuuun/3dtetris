import $ from 'jquery';
import EventEmitter2 from 'eventemitter2';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

class Tetris3dModel extends EventEmitter2 {
  constructor() {
    super();
  };
  
  newGame() {
    this.initGame();
    this.startGame();
  };
  
  initGame() {
    clearTimeout(this.tickId);
    clearInterval(this.renderId);
    this.isPlayng = false;
    this.lose = false;
    this.tickInterval = CONST.TICK_INTERVAL;
    this.sumOfClearLines = 0;
    this.score = 0;
    this.frameCount = 0;
    this.initBoad();
    this.initBlock();
    this.createNextBlock();
    // this.render();
  };
  
  startGame() {
    this.isPlayng = true;
    this.createCurrentBlock();
    this.createNextBlock();
    this.tick();
    // this.renderId = setInterval(() => { this.render(); }, this.RENDER_INTERVAL);
    this.emit('gamestart');
  };
  
  initBoad() {
    this.board = [];
    for ( let z = 0; z < CONST.LOGICAL_ROWS; ++z ) {
      this.board[z] = [];
      for ( let y = 0; y < CONST.COLS; ++y ) {
        this.board[z][y] = 0;
        for ( let x = 0; x < CONST.COLS; ++x ) {
          this.board[z][y][x] = 0;
        }
      }
    }
  };
  
  initBlock() {
    this.nextBlock = this.createBlock(null);
    this.currentBlock = this.createBlock(null);
    this.currentBlock.x = CONST.START_X;
    this.currentBlock.y = CONST.START_Y;
    this.currentBlock.z = CONST.START_Z;
  };
  
  createBlock(id) {
    // id = id || 0;
    // const block = {};
    // Object.assign(block, CONST.BLOCK_LIST[id]); // オブジェクトの複製（シャローコピー）
    const blockCONST = CONST.BLOCK_LIST[id] || {};
    const block = {
      id: id,
      color: blockCONST.color,
      shape: [], // blockの形状
      x: 0,
      y: 0,
      z: 0,
    };
    const shape = blockCONST.shape;
    block.shape = [];
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      block.shape[z] = [];
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        block.shape[z][y] = [];
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          block.shape[z][y][x] = shape[z][y][x] || 0;
        }
      }
    }
    this.emit('newblockcreated');
    return block;
  };
  
  createCurrentBlock() {
    if (!this.nextBlock) this.createNextBlock();
    this.currentBlock = this.nextBlock;
    this.currentBlock.x = CONST.START_X;
    this.currentBlock.y = CONST.START_Y;
    this.currentBlock.z = CONST.START_Z;
    this.emit('currentblockcreated');
  };
  
  createNextBlock() {
    var id = Math.floor(Math.random() * CONST.BLOCK_LIST.length);
    this.nextBlock = this.createBlock(id);
    this.emit('nextblockcreated');
  };
  
  // メインでループする関数
  tick() {
    clearTimeout(this.tickId);
    if (!this.moveBlock('down')) {
      this.freeze();
      this.clearLines();
      if (this.checkGameOver()) {
        this.emit('gameover');
        this.quitGame().then(function(){
        });
        return false;
      }
      this.frameCount++;
      this.createCurrentBlock();
      this.createNextBlock();
    }
    this.tickId = setTimeout(() => { this.tick(); }, this.tickInterval);
    this.emit('tick');
  };
  
  quitGame() {
    var dfd = $.Deferred();
    this.gameOverEffect().then(() => {
      this.isPlayng = false;
      this.emit('gamequit');
      dfd.resolve();
    });
    return dfd.promise();
  };
  stopGame() { this.quitGame() }; // alias
  
  pauseGame() {
    clearTimeout(this.tickId);
  };
  
  resumeGame() {
    if (!this.isPlayng) return;
    this.tickId = setTimeout(() => { this.tick(); }, this.tickInterval);
  };
  
  freeze() {
    for ( var y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
      for ( var x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
        var boardX = x + this.currentX;
        var boardY = y + this.currentY;
        if (!this.currentBlock[y][x] || boardY < 0) continue;
        this.board[boardY][boardX] = this.currentBlock[y][x];
      }
    }
    this.emit('freeze');
  };
  
  clearLines() {
    var _this = this;
    var clearLineLength = 0; // 同時消去ライン数
    var filledRowList = [];
    var blankRow = Array.apply(null, Array(CONST.COLS)).map(function(){ return 0; }); // => [0,0,0,0,0,...]
    var dfd = $.Deferred();
    dfd.resolve();
    for ( var y = CONST.LOGICAL_ROWS - 1; y >= 0; --y ) {
      var isRowFilled = this.board[y].every(function(val){
        return val !== 0;
      });
      if (!isRowFilled) continue;
      filledRowList.push(y);
      clearLineLength++;
      this.sumOfClearLines++;
      this.tickInterval -= CONST.SPEEDUP_RATE; // 1行消去で速度を上げる
    }
    // clear line drop
    dfd.then(dropRow(x, y));
    
    // calc score
    this.score += (clearLineLength <= 1) ? clearLineLength : Math.pow(2, clearLineLength);
    
    if (clearLineLength > 0) this.emit('clearline', filledRowList);
    
    function dropRow(x, y) {
      return function(){
        var dfd = $.Deferred();
        if (!filledRowList.length) return;
        filledRowList.reverse().forEach(function(row){
          _this.board.splice(row, 1);
          _this.board.unshift(blankRow);
        });
        dfd.resolve();
        return dfd.promise();
      };
    }
  };
  
  moveBlock(code) {
    switch (code) {
      case 'left':
        if ( this.valid(-1, 0) ) {
          --this.currentX;
          return true;
        }
        return false;
        break;
      case 'right':
        if ( this.valid(1, 0) ) {
          ++this.currentX;
          return true;
        }
        return false;
        break;
      case 'down':
        if ( this.valid(0, 1) ) {
          ++this.currentY;
          return true;
        }
        return false;
        break;
      case 'rotate':
        var rotatedBlock = this.rotate(this.currentBlock);
        if ( this.valid(0, 0, rotatedBlock) ) {
          this.currentBlock = rotatedBlock;
          return true;
        }
        return false;
        break;
    }
  };
  
  rotate() {
    var newBlock = [];
    for ( var y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
      newBlock[y] = [];
      for ( var x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
        newBlock[y][x] = this.currentBlock[CONST.VOXEL_LENGTH - 1 - x][y];
      }
    }
    return newBlock;
  };
  
  valid(offsetX, offsetY, newBlock) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    var nextX = this.currentX + offsetX;
    var nextY = this.currentY + offsetY;
    block = newBlock || this.currentBlock;
    
    for ( var y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
      for ( var x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
        var boardX = x + nextX;
        var boardY = y + nextY;
        if (!block[y][x]) continue;
        if ( typeof this.board[boardY] === 'undefined' // 次の位置が盤面外なら
          || typeof this.board[boardY][boardX] === 'undefined' // 盤面外なら
          || this.board[boardY][boardX] // 次の位置にブロックがあれば
          || boardX < 0 // 左壁
          || boardX >= CONST.COLS // 右壁
          || boardY >= CONST.LOGICAL_ROWS ) { // 底面
          
          return false;
        }
      }
    }
    return true;
  };
  
  checkGameOver() {
    // ブロックの全てが画面外ならゲームオーバー
    var isGameOver = true;
    for ( var y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
      for ( var x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
        var boardX = x + this.currentX;
        var boardY = y + this.currentY;
        if (boardY >= CONST.HIDDEN_ROWS) {
          isGameOver = false;
          break;
        }
      }
    }
    return isGameOver;
  };
}

module.exports = Tetris3dView;
