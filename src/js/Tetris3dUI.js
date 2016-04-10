import { EventEmitter2 } from 'eventemitter2';

export default class Tetris3dUI extends EventEmitter2 {
  constructor(controller) {
    super();
    
    this.controller = controller;
    this.$btnPause = $('.js-btn-pause');
    this.$switchCamera = $('.js-switch-camera');
    this.$switchBlock = $('.js-switch-block');
    this.$switchRotate = $('.js-switch-rotate');
    this.$btns = this.$switchCamera.add(this.$switchBlock);
    
    this.setEvent();
    this.setControllerEvent();
  }
  
  setEvent() {
    this.$switchCamera.on('click', (evt) => {
      evt.stopPropagation();
      this.switchModeCamera();
      this.controller.switchModeCamera();
    });
    this.$switchBlock.on('click', (evt) => {
      evt.stopPropagation();
      this.switchModeBlock();
      this.controller.switchModeBlock();
    });
    this.$switchRotate.on('click', (evt) => {
      evt.stopPropagation();
      this.$switchRotate.toggleClass('is-active');
      this.controller.changeRotateDirection();
    });
    this.$btnPause.on('touchstart', (evt) => {
      console.log('touchstart', evt);
    });
    this.$btnPause.on('click', (evt) => {
      // 親要素のtouchstart殺すとclick発火しないのか？
      // pcだと動くけどspにするとだめ
      console.log('click', evt);
      evt.stopPropagation();
      this.$btnPause.toggleClass('is-active');
      
      console.log(this.controller.isPlayngGame);
      if (this.controller.isPlayngGame) {
        this.controller.pauseGame();
      }
      else {
        this.controller.resumeGame();
      }
    });
  }
  
  setControllerEvent() {
    this.controller.on('switchModeCamera', () => {
      this.switchModeCamera();
    });
    this.controller.on('switchModeBlock', () => {
      this.switchModeBlock();
    });
  }
  
  switchModeCamera() {
    this.$btns.removeClass('is-active');
    this.$switchCamera.addClass('is-active');
  }
  
  switchModeBlock() {
    this.$btns.removeClass('is-active');
    this.$switchBlock.addClass('is-active');
  }
}
