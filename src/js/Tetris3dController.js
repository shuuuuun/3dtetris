// import $ from 'jquery';
import _ from 'lodash';
import { EventEmitter2 } from 'eventemitter2';
import TouchController from './TouchController';
import StickController from './StickController';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

export default class Tetris3dController extends EventEmitter2 {
  constructor(model, view) {
    super();
    
    this.model = model;
    this.view = view;
    
    this.$root = $('.js-game-controller');
    this.$infoLevel = $('.js-info-level');
    this.$infoScore = $('.js-info-score');
    this.$infoLines = $('.js-info-lines');
    this.$stickContainer = $('.js-stick-container');
    this.$stickToucharea = $('.js-stick-toucharea');
    this.touch = new TouchController();
    this.stick = new StickController({
      $element: this.$stickToucharea
    });
    
    this.isAutoMode = false;
    this.isPlayngGame = false;
    this.isPausingGame = false;
    
    this.setModelEvent();
    this.setBlurEvent();
    this.setKeyEvent();
    this.setTouchEvent(this.$root);
    this.setStickController();
  }
  
  newGame() {
    this.view.dispose();
    this.view.init();
    this.view.start();
    this.model.initGame();
    this.model.startGame();
    this.isPlayngGame = true;
    this.isPausingGame = false;
  }
  
  pauseGame() {
    this.view.stop();
    this.model.pauseGame();
    this.isPlayngGame = false;
    this.isPausingGame = true;
    this.emit('pauseGame');
  }
  
  resumeGame() {
    this.view.start();
    this.model.resumeGame();
    this.isPlayngGame = true;
    this.isPausingGame = false;
    this.emit('resumeGame');
  }
  
  setModelEvent() {
    this.model.on('gamestart', () => {});
    this.model.on('newblockcreated', () => {});
    this.model.on('currentblockcreated', () => {
      this.view.drawCurrentBlock(this.model.currentBlock);
      
      let shadowBlock = this.getShadowBlock();
      this.view.drawShadowBlock(shadowBlock);
    });
    this.model.on('nextblockcreated', () => {});
    this.model.on('gameover', () => {
      if (this.isAutoMode) {
        this.newGame();
      }
      // alert('gameover!!');
      this.emit('gameover');
    });
    this.model.on('tick', (isNewBlock) => {
      this.view.moveCurrentBlock(this.model.currentBlock);
      
      let shadowBlock = this.getShadowBlock();
      this.view.moveShadowBlock(shadowBlock);
    });
    this.model.on('blockmoved', () => {
      this.view.moveCurrentBlock(this.model.currentBlock);
      
      let shadowBlock = this.getShadowBlock();
      this.view.moveShadowBlock(shadowBlock);
    });
    this.model.on('gamequit', () => {});
    this.model.on('freeze', () => {
      this.updateBoard();
    });
    this.model.on('clearline', (filledRowList) => {
      this.updateBoard();
      this.$infoLevel.text(this.model.level);
      this.$infoScore.text(this.model.score);
      this.$infoLines.text(this.model.sumOfClearLines);
    });
  }
  
  getShadowBlock() {
    let shadowBlock = _.clone(this.model.currentBlock);
    shadowBlock.id = CONST.SHADOW_BLOCK.id;
    this.model.dropBlockY(shadowBlock);
    return shadowBlock;
  }
  
  setBlurEvent() {
    $(window).on('blur', () => {
        this.pauseGame();
    }).on('focus', () => {
      // this.resumeGame();
    });
  }
  
  setKeyEvent() {
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
    
    $(document).on('keydown', (evt) => {
      // console.log(evt.keyCode);
      if (!this.isPlayngGame) { // プレイ中以外はキー操作無効
        return;
      }
      const methodName = keyMap.get(evt.keyCode);
      if (!methodName) {
        return;
      }
      evt.preventDefault();
      this.handleMethod(methodName);
    });
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
  
  setTouchEvent($element) {
    this.touch.setElement($element.get(0));
    let touchStartX;
    let touchStartY;
    let isFreeze = false;

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
      // console.log('touchmove', blockMoveX, blockMoveY, isFreeze);
      
      if (isFreeze) return;
      
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
      // if (!!evt.isTap) this.rotateBlock();
      if (evt.isDoubleTap) {
        // console.log(evt.isDoubleTap);
        this.dropBlock();
      }
    });
  }
  
  setStickController() {
    this.stick.on('moved', (evt) => {
      this.model.pauseGame(); // カメラ動かしてる間は一時停止
      this.view.controls.rotate({
        x: evt.x / -1000,
        y: evt.y / -1000,
      });
      setTimeout(() => {
        this.model.resumeGame(); // カメラ止まると再開
      });
    });
    this.stick.on('doubletapped', (evt) => {
      this.view.setCamera(); // reset camera position
    });
  }
  
  switchModeCamera() {
    console.log('switchModeCamera');
    this.touch.dispose();
    this.view.enableControls();
    this.emit('switchModeCamera');
  }
  
  switchModeBlock() {
    console.log('switchModeBlock');
    this.touch.setEvent();
    this.view.disableControls();
    this.emit('switchModeBlock');
  }
  
  changeRotateDirection() {
    console.log('changeRotateDirection');
    this.isVertical = !this.isVertical;
    this.emit('changeRotateDirection');
  }
  
  updateBoard() {
    // viewのためにboardを整形、CONST.HIDDEN_ROWSのぶんyを減らして渡す
    let board = _.cloneDeep(this.model.board);
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
  
  rotateBlockHorizontal() {
    this.model.rotateBlockXZ();
  }
  
  rotateBlockVertical() {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.rotateBlockXY(direction.x < 0);
    }
    if (direction.z !== 0) {
      this.model.rotateBlockZY(direction.z < 0);
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
}
