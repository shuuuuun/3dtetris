import { EventEmitter2 } from 'eventemitter2';
import StickController from './StickController';

export default class Tetris3dUI extends EventEmitter2 {
  constructor() {
    super();
    
    this.$switchCamera = $('.js-switch-camera');
    this.$switchBlock = $('.js-switch-block');
    this.$switchRotate = $('.js-switch-rotate');
    this.$btns = this.$switchCamera.add(this.$switchBlock);
    
    this.setStickController();
    this.setEvent();
  }
  
  setStickController() {
    const $stickContainer = $('.js-stick-container');
    const $stickToucharea = $('.js-stick-toucharea');
    const radius = $stickContainer.width() / 2 + $stickToucharea.width() / 2;
    const stick = new StickController($stickToucharea, radius);
  }
  
  setEvent() {
    this.$switchCamera.on('click', () => {
      this.switchModeCamera();
      this.emit('switchCameraClick');
    });
    this.$switchBlock.on('click', () => {
      this.switchModeBlock();
      this.emit('switchBlockClick');
    });
    this.$switchRotate.on('click', () => {
      this.$switchRotate.toggleClass('is-active');
      this.emit('switchRotateClick');
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
