import _ from 'lodash';
import { EventEmitter2 } from 'eventemitter2';
import Util from './Util';
import TouchController from './TouchController';
import StickController from './StickController';
import TetricusCONST from './TetricusCONST';

const CONST = TetricusCONST;

export default class TetricusController extends EventEmitter2 {
  constructor(model, view) {
    super();
    
    this.model = model;
    this.view = view;
    
    this.rootElm = document.querySelector('.js-game-controller');
    this.stickTouchareaElm = document.querySelector('.js-stick-toucharea');
    this.infoLevelElm = document.querySelector('.js-info-level');
    this.infoScoreElm = document.querySelector('.js-info-score');
    this.infoLinesElm = document.querySelector('.js-info-lines');
    
    this.touch = new TouchController({
      touchstartElement: this.rootElm,
      touchmoveElement: document,
      touchendElement: document,
      holdingDelay: 200,
      watchInterval: 100,
    });
    this.stick = new StickController({
      element: this.stickTouchareaElm,
      maxDistance: 30,
      holdingDelay: 50,
      watchInterval: CONST.STICK_CONTROLL_THROTTLE,
    });
    
    this.isAutoMode = false;
    this.isTutorialMode = false;
    this.isPlayngGame = false;
    this.isPausingGame = false;
    
    this.initModelEvent();
    this.initResizeEvent();
    this.initBlurEvent();
    this.initKeyEvent();
    this.initTouchEvent();
    this.initStickController();
  }
  
  newGame() {
    this.view.dispose();
    this.view.init();
    this.view.start();
    this.model.initGame();
    this.model.startGame();
    this.isPlayngGame = true;
    this.isPausingGame = false;
    this.emit('startGame');
  }
  
  pauseGame() {
    this.view.stop();
    this.model.pauseGame();
    this.isPlayngGame = false;
    this.isPausingGame = true;
    this.saveDataToStrage();
    this.emit('pauseGame');
  }
  
  resumeGame() {
    this.view.start();
    this.model.resumeGame();
    this.isPlayngGame = true;
    this.isPausingGame = false;
    this.emit('resumeGame');
  }
  
  resumeLastGame() {
    const data = this.getStrageData();
    this.setDataToModel(data);
    if (this.model.checkGameOver()) {
      this.newGame();
      return;
    }
    this.view.isAutoRotate = false;
    this.view.dispose();
    this.view.init();
    this.view.start();
    this.view.drawCurrentBlock(this.model.currentBlock);
    this.isPlayngGame = true;
    this.isPausingGame = false;
    this.model.resumeGame();
    this.updateBoard();
  }
  
  setAutoMode() {
    this.isAutoMode = true;
    this.isTutorialMode = false;
    this.view.isAutoRotate = true;
  }
  
  setTutorialMode() {
    this.isAutoMode = false;
    this.isTutorialMode = true;
    this.view.isAutoRotate = false;
    this.view.setCamera(); // reset camera
  }
  
  initModelEvent() {
    this.model.on('gamestart', () => {
      this.view.isAutoRotate = this.isAutoMode;
    });
    this.model.on('newblockcreated', () => {});
    this.model.on('currentblockcreated', () => {
      this.updateCurrentBlock(true);
    });
    this.model.on('nextblockcreated', () => {});
    this.model.on('gameover', () => {
      if (this.isAutoMode || this.isTutorialMode) {
        this.newGame();
      }
      else {
        this.view.isAutoRotate = true;
      }
      this.emit('gameover');
    });
    this.model.on('tick', (isNewBlock) => {
      this.updateCurrentBlock();
      
      if (!this.isAutoMode && !this.isTutorialMode) {
        this.saveDataToStrage();
      }
    });
    this.model.on('blockmoved', () => {
      this.updateCurrentBlock();
    });
    this.model.on('gamequit', () => {});
    this.model.on('freeze', () => {
      this.updateBoard();
    });
    this.model.on('clearline', () => {
      this.updateBoard();
      this.infoLevelElm.innerText = this.model.level;
      this.infoScoreElm.innerText = Util.zeroPadding(this.model.score, 4);
      this.infoLinesElm.innerText = Util.zeroPadding(this.model.sumOfClearLines, 4);
    });
    this.model.on('beforeDropClearLines', (evt) => {
      const dfd = $.Deferred();
      dfd
        .resolve()
        .then(() => {
          this.model.pauseGame();
        })
        .then(this.effectClearLine(evt))
        .then(() => {
          this.model.resumeGame();
          evt.dfd.resolve();
        });
    });
    this.model.on('afterDropClearLines', () => {
      this.updateBoard();
    });
  }
  
  effectClearLine(evt) {
    return () => {
      let dfd = $.Deferred();
      let dfd2 = $.Deferred();
      dfd2.resolve();
      
      const setEffect = (board, x, y, z) => {
        dfd2 = dfd2
          .then(Util.sleep(CONST.CLEARLINE_EFFECT_INTERVAL))
          .then(() => {
            board[z][y][x] = CONST.CLEARLINE_BLOCK.id + 1;
            this.updateBoard(board);
          });
      };
      evt.filledRowList.reverse().forEach((row, y) => {
        let filledRowListX = row[0];
        let filledRowListZ = row[1];
        if (!filledRowListX.length && !filledRowListZ.length) return;
        
        filledRowListX.forEach((x) => {
          let board = _.cloneDeep(this.model.board);
          
          for ( var z = 0; z < CONST.COLS; ++z ) {
            if (!board[z][y][x]) continue;
            setEffect(board, x, y, z);
          }
        });
        filledRowListZ.forEach((z) => {
          let board = _.cloneDeep(this.model.board);
          
          for ( var x = 0; x < CONST.COLS; ++x ) {
            if (!board[z][y][x]) continue;
            setEffect(board, x, y, z);
          }
        });
      });
      
      dfd2.then(() => {
        dfd.resolve();
      });
      return dfd.promise();
    };
  }
  
  getShadowBlock() {
    let shadowBlock = _.clone(this.model.currentBlock);
    shadowBlock.id = CONST.SHADOW_BLOCK.id;
    this.model.dropBlockY(shadowBlock);
    return shadowBlock;
  }
  
  setBlockToBoard(block) {
    let board = _.cloneDeep(this.model.board);
    // freeze
    for ( let z = 0; z < CONST.VOXEL_LENGTH; ++z ) {
      for ( let y = 0; y < CONST.VOXEL_LENGTH; ++y ) {
        for ( let x = 0; x < CONST.VOXEL_LENGTH; ++x ) {
          let boardX = x + block.x;
          let boardY = y + block.y;
          let boardZ = z + block.z;
          if (!block.shape[z][y][x] || boardZ < 0) continue;
          board[boardZ][boardY][boardX] = block.shape[z][y][x] ? (block.id + 1) : 0;
        }
      }
    }
    return board;
  }
  
  initResizeEvent() {
    window.addEventListener('resize', () => {
      this.view.setSize();
    }, false);
  }
  
  initBlurEvent() {
    window.addEventListener('blur', () => {
      this.pauseGame();
    }, false);
    window.addEventListener('focus', () => {
      if (this.isAutoMode || this.isTutorialMode) {
        this.resumeGame();
      }
    }, false);
  }
  
  initKeyEvent() {
    const mapArray = [
      [37, 'left'], // ←
      [39, 'right'], // →
      [40, 'forward'], // ↓
      [38, 'backward'], // ↑
      [32, 'rotate'], // space
      [16, 'rotateX'], // shift
      [17, 'rotateY'], // control
      [13, 'drop'], // enter
      [27, 'pause'], // esc
      [48, 'pers'], // 0
      [49, 'ortho1'], // 1
      [50, 'ortho2'], // 2
      [51, 'ortho3'], // 3
      [67, 'camera'], // c
      [66, 'block'], // b
    ];
    const keyMap = new Map(mapArray);
    
    document.addEventListener('keydown', (evt) => {
      if (!this.isPlayngGame) { // プレイ中以外はキー操作無効
        return;
      }
      const methodName = keyMap.get(evt.keyCode);
      if (!methodName) {
        return;
      }
      evt.preventDefault();
      this.handleMethod(methodName);
    }, false);
  }
  
  handleMethod(methodName) { // helper
    switch (methodName) {
      case 'left':
        this.moveBlockRightAndLeft(-1);
        break;
      case 'right':
        this.moveBlockRightAndLeft(1);
        break;
      case 'forward':
        this.moveBlockBackAndForward(1);
        break;
      case 'backward':
        this.moveBlockBackAndForward(-1);
        break;
      case 'rotate':
        this.rotateBlock();
        break;
      case 'rotateX':
        this.rotateBlockHorizontal();
        break;
      case 'rotateY':
        this.rotateBlockVertical();
        break;
      case 'drop':
        this.dropBlock();
        break;
      case 'pause':
        this.pauseGame();
        break;
        
      case 'pers':
        break;
      case 'ortho1':
        break;
      case 'ortho2':
        break;
      case 'ortho3':
        break;
        
      case 'camera':
        this.switchModeCamera();
        break;
      case 'block':
        this.switchModeBlock();
        break;
        
      default:
        break;
    }
  }
  
  initTouchEvent() {
    let touchStartX;
    let touchStartY;
    let isFreeze = false;
    let isBlockMoved = false;

    this.model.on('freeze', () => {
      isFreeze = true;
    });
    this.touch.on('touchstart', (evt) => {
      touchStartX = evt.touchStartX;
      touchStartY = evt.touchStartY;
      isFreeze = false;
    });
    this.touch.on('touchmove', (evt) => {
      let moveX = evt.touchX - touchStartX;
      let moveY = evt.touchY - touchStartY;
      let blockMoveX = (moveX / CONST.VOXEL_SIZE) | 0;
      let blockMoveY = (moveY / CONST.VOXEL_SIZE) | 0;
      
      if (isFreeze) return;
      
      if (blockMoveX || blockMoveY) {
        isBlockMoved = true;
      }
      
      // 1マスずつバリデーション（すり抜け対策）
      while (blockMoveX) {
        let sign = blockMoveX / Math.abs(blockMoveX); // 1 or -1
        this.moveBlockRightAndLeft(sign);
        blockMoveX -= sign;
        touchStartX = evt.touchX;
      }
      while (blockMoveY) {
        let sign = blockMoveY / Math.abs(blockMoveY); // 1 or -1
        this.moveBlockBackAndForward(sign);
        blockMoveY -= sign;
        touchStartY = evt.touchY;
      }
    });
    this.touch.on('touchend', (evt) => {
      const elm = this.rootElm;
      const verticalBtnHeight = elm.clientHeight * 0.25;
      const horizontalBtnWidth = elm.clientWidth * 0.5;
      const bottomBtnY = elm.clientHeight - verticalBtnHeight;
      if (evt.isDoubleTap) {
        // TODO: ダブルタップの一回目のタップを区別する解決策
        // this.dropBlock();
        // return;
      }
      if (evt.isTap) {
        if (evt.touchEndY < verticalBtnHeight) {
          this.rotateBlockVertical(true);
          this.emit('taptop');
        }
        else if (evt.touchEndY > bottomBtnY) {
          this.rotateBlockVertical(false);
          this.emit('tapbottom');
        }
        else if (evt.touchEndX < horizontalBtnWidth) {
          this.rotateBlockHorizontal(false);
          this.emit('tapleft');
        }
        else {
          this.rotateBlockHorizontal(true);
          this.emit('tapright');
        }
        this.updateCurrentBlock();
      }
      this.emit('touchend', {
        isBlockMoved: isBlockMoved,
      });
      isBlockMoved = false;
    });
    this.touch.on('touchholding', () => {
      this.model.moveBlockY();
    });
  }
  
  initStickController() {
    let isStickMoved = false;
    
    this.stick.on('moved', Util.throttle((evt) => {
      isStickMoved = true;
      this.rotateView(evt);
    }, CONST.STICK_CONTROLL_THROTTLE));
    this.stick.on('doubletapped', () => {
      this.view.setCamera(); // reset camera position
    });
    this.stick.on('holding', (evt) => {
      this.rotateView(evt);
    });
    this.stick.on('touchend', () => {
      this.emit('stickTouchend', {
        isStickMoved: isStickMoved,
      });
      isStickMoved = false;
    });
  }
  
  rotateView(delta) {
    // TODO: 下にやり過ぎるとzoomしちゃう問題
    let controlsDeltaX = delta.x / -CONST.STICK_WEIGHT;
    let controlsDeltaY = delta.y / -CONST.STICK_WEIGHT;
    if (controlsDeltaY < 0 && this.view.camera.position.y > CONST.HEIGHT) { // 底面より下にはいかないように
      this.view.camera.position.y = CONST.HEIGHT;
      controlsDeltaY = 0;
    }
    this.model.pauseGame(); // カメラ動かしてる間は一時停止
    this.view.controls.rotate({
      x: controlsDeltaX,
      y: controlsDeltaY,
    });
    setTimeout(() => {
      this.model.resumeGame(); // カメラ止まると再開
    });
  }
  
  switchModeCamera() {
    this.touch.dispose();
    this.view.enableControls();
    this.emit('switchModeCamera');
  }
  
  switchModeBlock() {
    this.touch.setEvent();
    this.view.disableControls();
    this.emit('switchModeBlock');
  }
  
  changeRotateDirection() {
    this.isVertical = !this.isVertical;
    this.emit('changeRotateDirection');
  }
  
  updateCurrentBlock(isCreate = false) {
    if (isCreate) this.view.drawCurrentBlock(this.model.currentBlock);
    else this.view.moveCurrentBlock(this.model.currentBlock);
    
    const shadowBlock = this.getShadowBlock();
    const board = this.setBlockToBoard(shadowBlock);
    this.updateBoard(board);
  }
  
  updateBoard(board = this.model.board) {
    // viewのためにboardを整形、CONST.HIDDEN_ROWSのぶんyを減らして渡す
    board = _.cloneDeep(board);
    board.forEach((aryZ) => {
      aryZ.splice(0, CONST.HIDDEN_ROWS);
    });
    this.view.disposeBoard();
    this.view.drawBoard(board);
  }
  
  rotateBlock() {
    if (this.isVertical) {
      this.rotateBlockVertical();
    }
    else {
      this.rotateBlockHorizontal();
    }
  }
  
  rotateBlockHorizontal(sign = true) {
    this.model.rotateBlockXZ(sign);
  }
  
  rotateBlockVertical(sign = true) {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.rotateBlockXY(sign ? direction.x < 0 : direction.x >= 0);
    }
    if (direction.z !== 0) {
      this.model.rotateBlockZY(sign ? direction.z < 0 : direction.z >= 0);
    }
  }
  
  moveBlockRightAndLeft(distance) {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.moveBlockZ(distance * direction.x);
    }
    if (direction.z !== 0) {
      this.model.moveBlockX(distance * -direction.z);
    }
  }
  
  moveBlockBackAndForward(distance) {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.moveBlockX(distance * direction.x);
    }
    if (direction.z !== 0) {
      this.model.moveBlockZ(distance * direction.z);
    }
  }
  
  dropBlock() {
    this.model.dropBlockY();
    this.view.moveCurrentBlock(this.model.currentBlock);
  }
  
  setDataToModel(data = {}) {
    if (data.level) this.model.level = data.level;
    if (data.score) this.model.score = data.score;
    if (data.sumOfClearLines) this.model.sumOfClearLines = data.sumOfClearLines;
    if (data.tickInterval) this.model.tickInterval = data.tickInterval;
    if (data.frameCount) this.model.frameCount = data.frameCount;
    if (data.board) this.model.board = data.board;
    if (data.currentBlock) this.model.currentBlock = data.currentBlock;
    if (data.nextBlock) this.model.nextBlock = data.nextBlock;
  }
  
  getStrageData() {
    if (!window.localStorage) {
      return;
    }
    const currentData = JSON.parse(window.localStorage.getItem('tetricus')) || {};
    return currentData;
  }
  
  saveDataToStrage() {
    if (!window.localStorage) {
      return;
    }
    const newData = {
      level: this.model.level,
      score: this.model.score,
      sumOfClearLines: this.model.sumOfClearLines,
      tickInterval: this.model.tickInterval,
      frameCount: this.model.frameCount,
      board: this.model.board,
      currentBlock: this.model.currentBlock,
      nextBlock: this.model.nextBlock,
    };
    window.localStorage.setItem('tetricus', JSON.stringify(newData));
  }
}
