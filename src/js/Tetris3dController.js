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
  }
  
  pauseGame() {
    this.view.stop();
    this.model.pauseGame();
    this.isPlayngGame = false;
  }
  
  resumeGame() {
    this.view.start();
    this.model.resumeGame();
    this.isPlayngGame = true;
  }
  
  setModelEvent() {
    this.model.on('gamestart', () => {});
    this.model.on('newblockcreated', () => {});
    this.model.on('currentblockcreated', () => {
      this.view.drawCurrentBlock(this.model.currentBlock);
      
      let shadowBlock = _.clone(this.model.currentBlock);
      shadowBlock.y = CONST.ROWS + 1;
      shadowBlock.id = CONST.SHADOW_BLOCK.id;
      this.view.drawShadowBlock(shadowBlock);
    });
    this.model.on('nextblockcreated', () => {});
    this.model.on('gameover', () => {
      alert('gameover!!');
    });
    this.model.on('tick', (isNewBlock) => {
      this.view.moveCurrentBlock(this.model.currentBlock);
      
      // let shadowBlock = _.cloneDeep(this.model.currentBlock);
      // let shadowBlock = Object.assign(this.model.currentBlock);
      let shadowBlock = _.clone(this.model.currentBlock);
      shadowBlock.id = CONST.SHADOW_BLOCK.id;
      this.model.dropBlockY(shadowBlock);
      this.view.moveShadowBlock(shadowBlock);
    });
    this.model.on('blockmoved', () => {
      this.view.moveCurrentBlock(this.model.currentBlock);
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
  
  setBlurEvent() {
    $(window).on('blur', () => {
        this.pauseGame();
    }).on('focus', () => {
        this.resumeGame();
    });
  }
  
  setKeyEvent() {
    $(document).on('keydown', (evt) => {
      // TODO: ここもう少し整理する
      switch (evt.keyCode) {
        case 37: // ←
           // left
           this.moveBlockRightAndLeft(-1);
          break;
        case 39: // →
           // right
           this.moveBlockRightAndLeft(1);
          break;
        case 40: // ↓
           // forward
           this.moveBlockBackAndForward(1);
          break;
        case 38: // ↑
           // backward
           this.moveBlockBackAndForward(-1);
          break;
        case 32: // space
           // rotate
          this.rotateBlock();
          break;
        case 16: // shift
           // rotateX
          this.rotateBlockHorizontal();
          break;
        case 17: // control
          this.rotateBlockVertical();
           // rotateY
          break;
          
        case 48: // 0
           // pers
          break;
        case 49: // 1
           // ortho1
          break;
        case 50: // 2
           // ortho2
          break;
        case 51: // 3
           // ortho3
          break;
          
        case 67: // c
           // camera
          break;
        case 66: // b
           // block
          break;
        default:
          break;
      }
    });
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
        this.model.dropBlockY();
        this.view.moveCurrentBlock(this.model.currentBlock);
      }
    });
  }
  
  setStickController() {
    this.stick.on('moved', (evt) => {
      this.view.controls.rotate({
        x: evt.x / -1000,
        y: evt.y / -1000,
      });
    });
    this.stick.on('doubletapped', (evt) => {
      this.view.setCamera(); // reset camera position
    });
  }
  
  swithMode(code) {
    switch (code) {
      case 'camera':
        this.switchModeCamera();
        break;
      case 'block':
        this.switchModeBlock();
        break;
    }
  }
  
  switchModeCamera() {
    console.log('switchModeCamera');
    this.touch.dispose();
    this.view.startControls();
    this.emit('switchModeCamera');
  }
  
  switchModeBlock() {
    console.log('switchModeBlock');
    this.touch.setEvent();
    this.view.stopControls();
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
  
}
