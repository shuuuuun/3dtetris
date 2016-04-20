import { EventEmitter2 } from 'eventemitter2';

export default class Tetris3dUI extends EventEmitter2 {
  constructor(controller) {
    super();
    
    this.controller = controller;
    this.$modalPause = $('.js-modal-pause');
    this.$modalGameover = $('.js-modal-gameover');
    this.$modalStart = $('.js-modal-start');
    this.$modalHowto = $('.js-modal-howto');
    this.$modalResult = $('.js-modal-result');
    this.$btnPause = $('.js-btn-pause');
    this.$switchCamera = $('.js-switch-camera');
    this.$switchBlock = $('.js-switch-block');
    this.$switchRotate = $('.js-switch-rotate');
    this.$btnRotateVertical = $('.js-btn-rotate-vertical');
    this.$btnRotateHorizontal = $('.js-btn-rotate-horizontal');
    this.$btns = this.$switchCamera.add(this.$switchBlock);
    
    this.setEvent();
    this.setControllerEvent();
  }
  
  setEvent() {
    $('button').on('touchstart', (evt) => {
      // touch event bug fix
      // cf. http://jsdo.it/shuuuuun/WLX1
      evt.stopPropagation();
    });
    this.$switchCamera.on('click', (evt) => {
      this.switchModeCamera();
      this.controller.switchModeCamera();
    });
    this.$switchBlock.on('click', (evt) => {
      this.switchModeBlock();
      this.controller.switchModeBlock();
    });
    this.$switchRotate.on('click', (evt) => {
      this.$switchRotate.toggleClass('is-active');
      this.controller.changeRotateDirection();
    });
    this.$btnPause.on('click', (evt) => {
      this.$btnPause.toggleClass('is-active');
      
      if (this.controller.isPlayngGame) {
        this.controller.pauseGame();
      }
      else {
        this.controller.resumeGame();
      }
    });
    this.$btnRotateVertical.on('click', (evt) => {
      this.controller.rotateBlockVertical();
    });
    this.$btnRotateHorizontal.on('click', (evt) => {
      this.controller.rotateBlockHorizontal();
    });
  }
  
  setControllerEvent() {
    this.controller.on('switchModeCamera', () => {
      this.switchModeCamera();
    });
    this.controller.on('switchModeBlock', () => {
      this.switchModeBlock();
    });
    this.controller.on('pauseGame', () => {
      this.$modalPause.show();
    });
    this.controller.on('resumeGame', () => {
      this.$modalPause.hide();
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
