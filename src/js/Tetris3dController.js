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
    
    this.$root = $('#canvas-container');
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
  };
  
  newGame() {
    this.view.init();
    this.view.start();
    this.model.initGame();
    this.model.startGame();
  };
  
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
      let isValid = this.model.valid(0, 1, 0, shadowBlock);
      while (isValid) {
        shadowBlock.y++;
        this.view.moveShadowBlock(shadowBlock);
        isValid = this.model.valid(0, 1, 0, shadowBlock);
      }
    });
    this.model.on('gamequit', () => {});
    this.model.on('freeze', () => {});
    this.model.on('clearline', (filledRowList) => {});
  };
  
  setBlurEvent() {
    $(window).on('blur', () => {
        this.view.stop();
        this.model.pauseGame();
    }).on('focus', () => {
        this.view.start();
        this.model.resumeGame();
    });
  };
  
  setKeyEvent() {
    $(document).on('keydown', (evt) => {
      // console.log(evt.keyCode, CONST.KEYS_MODEL[evt.keyCode], CONST.KEYS_VIEW[evt.keyCode], CONST.KEYS_CONTROLLER[evt.keyCode]);
      if (typeof CONST.KEYS_MODEL[evt.keyCode] !== 'undefined') {
        evt.preventDefault();
        this.model.moveBlock(CONST.KEYS_MODEL[evt.keyCode]);
      }
      if (typeof CONST.KEYS_VIEW[evt.keyCode] !== 'undefined') {
        evt.preventDefault();
        this.view.setCamera(CONST.KEYS_VIEW[evt.keyCode]);
      }
      if (typeof CONST.KEYS_CONTROLLER[evt.keyCode] !== 'undefined') {
        evt.preventDefault();
        this.swithMode(CONST.KEYS_CONTROLLER[evt.keyCode]);
      }
      // switch (code) {
      //   case 'left':
      //     break;
      //   case 'right':
      //     break;
      //   case 'down':
      //     break;
      //   case 'forward':
      //     break;
      //   case 'backward':
      //     break;
      //   case 'rotate':
      //     break;
      //   default:
      //     break;
      // }
    });
  };
  
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
      if (!!evt.isTap) this.rotateBlock();
    });
  };
  
  setStickController() {
    this.stick.on('moved', (evt) => {
      console.log(evt);
    })
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
  };
  
  switchModeCamera() {
    console.log('switchModeCamera');
    this.touch.dispose();
    this.view.startControls();
    this.emit('switchModeCamera');
  };
  
  switchModeBlock() {
    console.log('switchModeBlock');
    this.touch.setEvent();
    this.view.stopControls();
    this.emit('switchModeBlock');
  };
  
  changeRotateDirection() {
    console.log('changeRotateDirection');
    this.isVertical = !this.isVertical;
    this.emit('changeRotateDirection');
  };
  
  rotateBlock() {
    if (this.isVertical) {
      this.rotateBlockVertical();
    }
    else {
      this.rotateBlockHorizontal();
    }
  };
  
  rotateBlockHorizontal() {
    this.model.rotateBlockXZ();
  };
  
  rotateBlockVertical() {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.rotateBlockZY();
    }
    if (direction.z !== 0) {
      this.model.rotateBlockXY();
    }
  };
  
  moveBlockRightAndLeft(distance) {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.moveBlockZ(distance * direction.x);
    }
    if (direction.z !== 0) {
      this.model.moveBlockX(distance * -direction.z);
    }
  };
  
  moveBlockBackAndForward(distance) {
    let direction = this.view.checkCameraDirection();
    if (direction.x !== 0) {
      this.model.moveBlockX(distance * direction.x);
    }
    if (direction.z !== 0) {
      this.model.moveBlockZ(distance * direction.z);
    }
  };
  
}
