import $ from 'jquery';
import EE2 from 'eventemitter2';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

class Tetris3dModel extends EE2.EventEmitter2 {
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
        this.board[z][y] = [];
        for ( let x = 0; x < CONST.COLS; ++x ) {
          this.board[z][y][x] = 0;
        }
      }
    }
  };
  
  initBlock() {
    this.nextBlock = this.createBlock(0);
    this.currentBlock = this.createBlock(0);
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
        // this.quitGame().then(function(){});
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
    // this.gameOverEffect().then(() => {
    //   this.isPlayng = false;
    //   this.emit('gamequit');
    //   dfd.resolve();
    // });
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
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          let boardX = x + this.currentBlock.x;
          let boardY = y + this.currentBlock.y;
          let boardZ = z + this.currentBlock.z;
          if (!this.currentBlock.shape[z][y][x] || boardZ < 0) continue;
          this.board[boardZ][boardY][boardX] = this.currentBlock.shape[z][y][x];
        }
      }
    }
    this.emit('freeze');
  };
  
  clearLines() {
    let _this = this;
    let clearLineLength = 0; // 同時消去ライン数
    let filledRowList = [];
    let blankRow = Array.apply(null, Array(CONST.COLS)).map(function(){ return 0; }); // => [0,0,0,0,0,...]
    let dfd = $.Deferred();
    dfd.resolve();
    for ( let y = CONST.LOGICAL_ROWS - 1; y >= 0; --y ) {
      let isRowFilled = this.board[y].every(function(val){
        return val !== 0;
      });
      if (!isRowFilled) continue;
      filledRowList.push(y);
      clearLineLength++;
      this.sumOfClearLines++;
      this.tickInterval -= CONST.SPEEDUP_RATE; // 1行消去で速度を上げる
    }
    // clear line drop
    // dfd.then(dropRow(x, y));
    
    // calc score
    this.score += (clearLineLength <= 1) ? clearLineLength : Math.pow(2, clearLineLength);
    
    if (clearLineLength > 0) this.emit('clearline', filledRowList);
    
    function dropRow(x, y) {
      return function(){
        let dfd = $.Deferred();
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
          --this.currentBlock.x;
          return true;
        }
        return false;
        break;
      case 'right':
        if ( this.valid(1, 0) ) {
          ++this.currentBlock.x;
          return true;
        }
        return false;
        break;
      case 'down':
        if ( this.valid(0, 1) ) {
          ++this.currentBlock.y;
          return true;
        }
        return false;
        break;
      case 'rotate':
        let rotatedBlockShape = this.rotate(this.currentBlock);
        if ( this.valid(0, 0, rotatedBlockShape) ) {
          this.currentBlock.shape = rotatedBlockShape;
          return true;
        }
        return false;
        break;
    }
  };
  
  rotate(block) {
    let newBlockShape = [];
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      newBlockShape[z] = [];
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        newBlockShape[z][y] = [];
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          newBlockShape[z][y][x] = block.shape[CONST.VOXEL_LENGTH - 1 - x][y];
        }
      }
    }
    return newBlockShape;
  };
  
  valid(offsetX, offsetY, offsetZ, newBlockShape) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    offsetZ = offsetZ || 0;
    let nextX = this.currentX + offsetX;
    let nextY = this.currentY + offsetY;
    let nextZ = this.currentZ + offsetZ;
    let blockShape = newBlockShape || this.currentBlock.shape;
    
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          let boardX = x + nextX;
          let boardY = y + nextY;
          let boardZ = z + nextZ;
          if (!blockShape[z][y][x]) continue;
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
    }
    return true;
  };
  
  checkGameOver() {
    // ブロックの全てが画面外ならゲームオーバー
    let isGameOver = true;
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          let boardX = x + this.currentX;
          let boardY = y + this.currentY;
          let boardZ = z + this.currentZ;
          if (boardZ >= CONST.HIDDEN_ROWS) {
            isGameOver = false;
            break;
          }
        }
      }
    }
    return isGameOver;
  };
}

module.exports = Tetris3dModel;