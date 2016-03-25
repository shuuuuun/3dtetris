import { EventEmitter2 } from 'eventemitter2';
import TouchController from './TouchController';

class StickController extends EventEmitter2 {
  constructor($element, radius) {
    super();
    
    this.$element = $element;
    this.radius = radius;
    
    this.setEvent();
  }
  
  setEvent(){
    const touch = new TouchController();
    touch.setElement(this.$element.get(0));
    
    touch.on('touchmove', (evt) => {
      console.log(evt);
      this.movePosition({ x: evt.moveX, y: evt.moveY });
    });
    touch.on('touchend', (evt) => {
      this.animatePosition({ x: 0, y: 0 });
    });
  }
  
  checkPosition(){
    return {
      'top':  this.$element.position().top,
      'left': this.$element.position().left,
    };
  }
  
  movePosition(distance){
    const before = this.checkPosition();
    const target = {
      x: (before.left - distance.x),
      y: (before.top - distance.y),
    };
    this.setPosition(target);
  }
  
  animatePosition(target){
    const x = target.x * this.radius;
    const y = -target.y * this.radius;
    this.$element.animate({
      'top': y + 'px',
      'left': x + 'px',
    }, () => {
      this.emit('animateend');
    });
  }
  
  setPosition(target){
    const x = target.x * this.radius;
    const y = -target.y * this.radius;
    this.$element.css({
      'top': y + 'px',
      'left': x + 'px',
    });
  }
}

module.exports = StickController;
