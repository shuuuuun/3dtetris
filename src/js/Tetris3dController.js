import $ from 'jquery';
import _ from 'lodash';
import { EventEmitter2 } from 'eventemitter2';
import TouchController from './TouchController';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

class Tetris3dController extends EventEmitter2 {
  constructor(model, view) {
    super();
    
    this.model = model;
    this.view = view;
    
    this.$root = $("#canvas-container");
    this.touch = new TouchController();
    
    this.setModelEvent();
    this.setBlurEvent();
    this.setKeyEvent();
    this.setTouchEvent(this.$root);
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
      this.view.drawBlock(this.model.currentBlock);
    });
    this.model.on('nextblockcreated', () => {});
    this.model.on('gameover', () => {
      alert('gameover!!');
    });
    this.model.on('tick', (isNewBlock) => {
      // console.log(_.flattenDeep(this.model.currentBlock.shape).length);
      this.view.moveBlock(this.model.currentBlock);
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
      // console.log(evt.keyCode, CONST.KEYS_MODEL[evt.keyCode], CONST.KEYS_VIEW[evt.keyCode]);
      if (typeof CONST.KEYS_MODEL[evt.keyCode] !== 'undefined') {
        evt.preventDefault();
        this.model.moveBlock(CONST.KEYS_MODEL[evt.keyCode]);
      }
      if (typeof CONST.KEYS_VIEW[evt.keyCode] !== 'undefined') {
        evt.preventDefault();
        this.view.setCamera(CONST.KEYS_VIEW[evt.keyCode]);
      }
    });
  };
  
  setTouchEvent($element) {
    this.touch.setElement($element.get(0));
    var touchStartX;
    var touchStartY;
    var isFreeze = false;

    this.model.on('freeze', () => {
      isFreeze = true;
    });
    this.touch.on('touchstart', (evt) => {
      console.log('touchstart', evt);
      touchStartX = evt.touchStartX;
      touchStartY = evt.touchStartY;
      isFreeze = false;
    });
    this.touch.on('touchmove', (evt) => {
      var moveX = evt.touchX - touchStartX;
      var moveY = evt.touchY - touchStartY;
      var blockMoveX = (moveX / CONST.VOXEL_SIZE) | 0;
      var blockMoveY = (moveY / CONST.VOXEL_SIZE) | 0;
      console.log('touchmove', evt, blockMoveX);

      if (isFreeze) return;

      // 1マスずつバリデーション（すり抜け対策）
      // while (!!blockMoveX) {
      //   var sign = blockMoveX / Math.abs(blockMoveX); // 1 or -1
      //   if (!this.valid(sign, 0)) break;
      //   this.currentX += sign;
      //   blockMoveX -= sign;
      //   touchStartX = evt.touchX;
      // }
      // while (blockMoveY > 0) {
      //   if (!this.valid(0, 1)) break;
      //   this.currentY++;
      //   blockMoveY--;
      //   touchStartY = evt.touchY;
      // }
    });
    this.touch.on('touchend', (evt) => {
      // if (!!evt.isTap) this.moveBlock('rotate');
    });
  };
    
  swithModeCamera() {
    console.log('swithModeCamera');
    this.view.startControls();
  };
  
  swithModeBlock() {
    console.log('swithModeBlock');
    this.view.stopControls();
  };
  
}

module.exports = Tetris3dController;
