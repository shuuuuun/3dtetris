import $ from 'jquery';
import { EventEmitter2 } from 'eventemitter2';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

class Tetris3dController extends EventEmitter2 {
  constructor(model, view) {
    super();
    
    this.model = model;
    this.view = view;
    
    this.setModelEvent();
    this.setBlurEvent();
    this.setKeyEvent();
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
        this.view.changeCamera(CONST.KEYS_VIEW[evt.keyCode]);
      }
    });
  };
  
  setTouchEvent() {
    var touch = new TouchController(this.$cnvs);
    var touchStartX;
    var touchStartY;
    var isTap = false;
    var isFreeze = false;
    
    touch.on('touchstart', (evt, info) => {
      touchStartX = info.touchStartX;
      touchStartY = info.touchStartY;
      isTap = true;
      isFreeze = false;
    });
    touch.on('touchmove', (evt, info) => {
      // var blockMoveX = (info.moveX / this.BLOCK_SIZE) | 0;
      var moveX  = info.touchX - touchStartX;
      var moveY  = info.touchY - touchStartY;
      var blockMoveX = (moveX / this.BLOCK_SIZE) | 0;
      var blockMoveY = (moveY / this.BLOCK_SIZE) | 0;
      
      if (isFreeze) return;
      
      // 1マスずつバリデーション（すり抜け対策）
      while (!!blockMoveX) {
        var sign = blockMoveX / Math.abs(blockMoveX); // 1 or -1
        if (!this.valid(sign, 0)) break;
        this.currentX += sign;
        blockMoveX -= sign;
        touchStartX = info.touchX;
      }
      while (blockMoveY > 0) {
        if (!this.valid(0, 1)) break;
        this.currentY++;
        blockMoveY--;
        touchStartY = info.touchY;
      }
      isTap = false;
    });
    touch.on('touchend', (evt, info) => {
      if (!!isTap) this.moveBlock('rotate');
    });
    this.on('freeze', () => {
      isFreeze = true;
    });
  };
}

module.exports = Tetris3dController;
