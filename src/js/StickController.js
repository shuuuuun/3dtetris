import { EventEmitter2 } from 'eventemitter2';
import TouchController from './TouchController';

export default class StickController extends EventEmitter2 {
  constructor(opts = {}) {
    super();
    
    this.$element = opts.$element;
    this.maxDistance = opts.maxDistance;
    this.position = { x: 0, y: 0 };
    
    this.setEvent();
  }
  
  setEvent(){
    const touch = new TouchController({
      touchstartElement: this.$element.get(0),
      touchmoveElement: document,
      touchendElement: document,
    });
    
    touch.on('touchmove', (evt) => {
      this.movePosition({ x: -evt.deltaX, y: -evt.deltaY });
    });
    touch.on('touchend', (evt) => {
      this.animatePosition({ x: 0, y: 0 });
      if (evt.isDoubleTap) {
        this.emit('doubletapped');
      }
    });
  }
  
  movePosition(distance){
    const before = this.position;
    const target = {
      x: (before.x - distance.x),
      y: (before.y - distance.y),
    };
    this.jumpPosition(target);
    this.emit('moved', this.position);
  }
  
  animatePosition(target){
    if (!target) return;
    // TODO: jquery脱却したい
    $(this.position).animate(target, {
      step: (now, fx) => {
        const nowTarget = {};
        nowTarget[fx.prop] = fx.now; // fx.prop -> 'x' or 'y'
        this.jumpPosition(nowTarget);
      },
      complete: () => {
        this.setPosition(target);
        this.emit('animateend', this.position);
      },
    });
  }
  
  jumpPosition(target){
    if (!target) return;
    let x = target.x || this.position.x;
    let y = target.y || this.position.y;
    let d = Math.sqrt(x * x + y * y);
    if (this.maxDistance && d > this.maxDistance) {
      let ratio = this.maxDistance / d;
      x *= ratio;
      y *= ratio;
    }
    this.$element.css({
      'transform': `translate(${x}px, ${y}px)`,
    });
    this.setPosition(target);
    this.emit('jumped', this.position);
  }
  
  setPosition(target){
    this.position = target;
  }
}
