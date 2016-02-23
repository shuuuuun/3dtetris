import { EventEmitter2 } from 'eventemitter2';

class UserInterface extends EventEmitter2 {
  constructor() {
    super();
    
    this.$switchCamera = $('.js-switch-camera');
    this.$switchBlock = $('.js-switch-block');
    this.$btns = this.$switchCamera.add(this.$switchBlock);
    
    this.setEvent();
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

module.exports = UserInterface;
