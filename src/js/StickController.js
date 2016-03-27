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
      this.movePosition({ x: -evt.deltaX, y: -evt.deltaY });
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
    this.$element.animate({
      'top': target.y + 'px',
      'left': target.x + 'px',
    }, () => {
      this.emit('animateend');
    });
  }
  
  setPosition(target){
    this.$element.css({
      'top': target.y + 'px',
      'left': target.x + 'px',
    });
  }
}

module.exports = StickController;
