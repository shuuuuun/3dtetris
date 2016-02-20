import $ from 'jquery';
import { EventEmitter2 } from 'eventemitter2';
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
    for ( let z = 0; z < CONST.COLS; ++z ) {
      this.board[z] = [];
      for ( let y = 0; y < CONST.LOGICAL_ROWS; ++y ) {
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
    let isMoveDown = this.moveBlock('down');
    // console.log("tick", isMoveDown, this.checkGameOver());
    if (!isMoveDown) {
    // if (false) {
      this.freeze();
      // this.clearLines();
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
    this.emit('tick', !isMoveDown);
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
  
  moveBlockX(distance) { // sign: boolean
    // var sign = sign; // 1 or -1
    var isValid = this.valid(distance, 0, 0);
    if (isValid) this.currentBlock.x += distance;
    return isValid;
  };
  
  moveBlockY(distance) {
    var isValid = this.valid(0, distance, 0);
    if (isValid) this.currentBlock.y += distance;
    return isValid;
  };
  
  moveBlockZ(distance) {
    var isValid = this.valid(0, 0, distance);
    if (isValid) this.currentBlock.z += distance;
    return isValid;
  };
  
  moveBlock(code) {
    switch (code) {
      case 'left':
        var isValid = this.valid(1, 0, 0);
        if (isValid) ++this.currentBlock.x;
        return isValid;
        break;
      case 'right':
        var isValid = this.valid(-1, 0, 0);
        if (isValid) --this.currentBlock.x;
        return isValid;
        break;
      case 'down':
        var isValid = this.valid(0, 1, 0);
        if (isValid) ++this.currentBlock.y;
        return isValid;
        break;
      case 'forward':
        var isValid = this.valid(0, 0, 1);
        if (isValid) ++this.currentBlock.z;
        return isValid;
        break;
      case 'backward':
        var isValid = this.valid(0, 0, -1);
        if (isValid) --this.currentBlock.z;
        return isValid;
        break;
      case 'rotate':
        let rotatedBlockShape = this.rotate(this.currentBlock);
        var isValid = this.valid(0, 0, 0, rotatedBlockShape);
        if (isValid) this.currentBlock.shape = rotatedBlockShape;
        return isValid;
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
          newBlockShape[z][y][x] = block.shape[CONST.VOXEL_LENGTH - 1 - x][y][z];
        }
      }
    }
    return newBlockShape;
  };
  
  valid(offsetX, offsetY, offsetZ, newBlockShape) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    offsetZ = offsetZ || 0;
    let nextX = this.currentBlock.x + offsetX;
    let nextY = this.currentBlock.y + offsetY;
    let nextZ = this.currentBlock.z + offsetZ;
    let blockShape = newBlockShape || this.currentBlock.shape;
    
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          let boardX = x + nextX;
          let boardY = y + nextY;
          let boardZ = z + nextZ;
          if (!blockShape[z][y][x]) continue;
          if ( typeof this.board[boardZ] === 'undefined' // 次の位置が盤面外なら
            || typeof this.board[boardZ][boardY] === 'undefined' // 盤面外なら
            || typeof this.board[boardZ][boardY][boardX] === 'undefined' // 盤面外なら
            || !!this.board[boardZ][boardY][boardX] // 次の位置にブロックがあれば
            || boardX < 0 // 壁
            || boardX >= CONST.COLS // 壁
            || boardZ < 0 // 壁
            || boardZ >= CONST.COLS // 壁
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
          let boardX = x + this.currentBlock.x;
          let boardY = y + this.currentBlock.y;
          let boardZ = z + this.currentBlock.z;
          if (boardY >= CONST.HIDDEN_ROWS) {
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
