import { EventEmitter2 } from 'eventemitter2';

export default class Tetris3dUI extends EventEmitter2 {
  constructor() {
    super();
    
    this.$btnPause = $('.js-btn-pause');
    this.$switchCamera = $('.js-switch-camera');
    this.$switchBlock = $('.js-switch-block');
    this.$switchRotate = $('.js-switch-rotate');
    this.$btns = this.$switchCamera.add(this.$switchBlock);
    
    this.setEvent();
  }
  
  setEvent() {
    this.$switchCamera.on('click', (evt) => {
      evt.stopPropagation();
      this.switchModeCamera();
      this.emit('switchCameraClick');
    });
    this.$switchBlock.on('click', (evt) => {
      evt.stopPropagation();
      this.switchModeBlock();
      this.emit('switchBlockClick');
    });
    this.$switchRotate.on('click', (evt) => {
      evt.stopPropagation();
      this.$switchRotate.toggleClass('is-active');
      this.emit('switchRotateClick');
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
      this.emit('btnPauseClick');
    });
  }
  
  switchModeCamera() {
    this.$btns.removeClass('is-active');
    this.$switchCamera.addClass('is-active');
    this.emit('switchModeCamera');
  }
  
  switchModeBlock() {
    this.$btns.removeClass('is-active');
    this.$switchBlock.addClass('is-active');
    this.emit('switchModeBlock');
  }
}
