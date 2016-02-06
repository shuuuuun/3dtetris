import $ from 'jquery';
import { EventEmitter2 } from 'eventemitter2';
import Tetris3dCONST from './Tetris3dCONST';

const CONST = Tetris3dCONST;

class Tetris3dController extends EventEmitter2 {
  constructor(model, view) {
    super();
    
    this.model = model;
    this.view = view;
    
    this.eventify();
  };
  
  newGame() {
    this.view.init();
    this.view.start();
    this.model.initGame();
    this.model.startGame();
    
    this.view.drawVoxel(0, 0, 0, 0);
    this.view.drawVoxel(0, 0, 1, 1);
    this.view.drawVoxel(0, 1, 0, 2);
  };
  
  eventify() {
    // console.log(this.model.currentBlock);
    this.model.on('gamestart', () => {});
    this.model.on('newblockcreated', () => {});
    this.model.on('currentblockcreated', () => {});
    this.model.on('nextblockcreated', () => {});
    this.model.on('gameover', () => {});
    this.model.on('tick', () => {
      // console.log(this.model.currentBlock);
      // this.view.drawBlock(3, 0, 1, 0);
    });
    this.model.on('gamequit', () => {});
    this.model.on('freeze', () => {});
    this.model.on('clearline', (filledRowList) => {});
  };
  
  setBlurEvent() {
    $(window).on('blur', () => {
        this.pauseGame();
    }).on('focus', () => {
        this.resumeGame();
    });
  };
  
  setKeyEvent() {
    $(document).on('keydown', (evt) => {
      if (typeof this.KEYS[evt.keyCode] === 'undefined') return;
      evt.preventDefault();
      this.moveBlock(this.KEYS[evt.keyCode]);
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
