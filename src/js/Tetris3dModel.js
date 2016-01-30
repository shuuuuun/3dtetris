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
    this.createNewBlock();
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
    this.currentBlock = [];
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      this.currentBlock[z] = [];
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        this.currentBlock[z][y] = [];
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          this.currentBlock[z][y][x] = 0;
        }
      }
    }
    this.currentBlockId = 0;
    this.currentX = CONST.START_X;
    this.currentY = CONST.START_Y;
    this.currentZ = CONST.START_Z;
  };
  
  createNewBlock(index) {
    const block = {};
    Object.assign(block, CONST.BLOCK_LIST[index]); // オブジェクトの複製
    this.emit('newblockcreated');
    return block;
  };
  
  createCurrentBlock() {
    if (!this.nextBlock[0]) this.createNextBlock();
    this.currentBlock = this.nextBlock;
    this.currentBlockId = this.nextBlockId;
    this.currentX = CONST.START_X;
    this.currentY = CONST.START_Y;
    this.emit('currentblockcreated');
  };
  
  createNextBlock() {
    var index = Math.floor(Math.random() * CONST.SHAPE_LIST.length);
    this.createNewBlock(index);
    var shape = CONST.SHAPE_LIST[index];
    if (this.frameCount > 0 && this.frameCount % this.SPECIAL_SHAPE_INCIDENCE === 0) {
      index = Math.floor(Math.random() * CONST.SPECIAL_SHAPE_LIST.length);
      shape = CONST.SPECIAL_SHAPE_LIST[index];
      index += CONST.SHAPE_LIST.length;
    }
    this.nextBlockId = index;
    this.nextBlock = [];
    for (var y = 0; y < CONST.VOXEL_LENGTH; ++y) {
      this.nextBlock[y] = [];
      for (var x = 0; x < CONST.VOXEL_LENGTH; ++x) {
        var i = CONST.VOXEL_LENGTH * y + x;
        this.nextBlock[y][x] = (!!shape[i]) ? (index + 1) : 0;
      }
    }
    this.emit('nextblockcreated');
  };
  
  // メインでループする関数
  tick() {
    var _this = this;
    clearTimeout(this.tickId);
    if (!this.moveBlock('down')) {
      this.freeze();
      this.clearLines();
      if (this.checkGameOver()) {
        this.emit('gameover');
        this.quitGame().then(function(){
          // _this.newGame();
        });
        return false;
      }
      this.frameCount++;
      this.createNewBlock();
      this.createNextBlock();
    }
    this.tickId = setTimeout(function(){ _this.tick(); }, this.tickInterval);
    this.emit('tick');
  };
  
  quitGame() {
    var _this = this;
    var dfd = $.Deferred();
    this.gameOverEffect().then(function(){
      _this.isPlayng = false;
      _this.emit('gamequit');
      dfd.resolve();
    });
    return dfd.promise();
  };
  stopGame alias
  
  pauseGame() {
    clearTimeout(this.tickId);
  };
  
  resumeGame() {
    var _this = this;
    if (!this.isPlayng) return;
    this.tickId = setTimeout(function(){ _this.tick(); }, this.tickInterval);
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
