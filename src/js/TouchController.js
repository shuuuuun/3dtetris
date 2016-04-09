import { EventEmitter2 } from 'eventemitter2';

export default class TouchController extends EventEmitter2 {
  constructor() {
    super();
    
    this.doubleTapDelay = 500;
    
    this.touchsupport = ('ontouchstart' in window);
    this.touchstart = (this.touchsupport) ? 'touchstart' : 'mousedown';
    this.touchmove  = (this.touchsupport) ? 'touchmove'  : 'mousemove';
    this.touchend   = (this.touchsupport) ? 'touchend'   : 'mouseup';
    
    this.deltaX = 0;
    this.deltaY = 0;
    this.moveX = 0;
    this.moveY = 0;
    
    this.defineEventListener();
  }
  
  setElement(element) {
    this.element = element;
    
    this.setEvent();
  }
  
  setEvent() {
    this.element.addEventListener(this.touchstart, this.onTouchStart, false);
    this.element.addEventListener(this.touchmove, this.ontouchMove, false);
    this.element.addEventListener(this.touchend, this.onTouchEnd, false);
    
    // document.addEventListener(touchstart, function(){ return false; }, false); // disableDocumentTouch
    // document.addEventListener(touchmove, ontouchMove, false);
    // document.addEventListener(touchend, onTouchEnd, false);
  }
  
  dispose() {
    this.element.removeEventListener(this.touchstart, this.onTouchStart, false);
    this.element.removeEventListener(this.touchmove, this.ontouchMove, false);
    this.element.removeEventListener(this.touchend, this.onTouchEnd, false);
  }
  
  defineEventListener() {
    this.onTouchStart = (evt) => {
      evt.preventDefault(); // enablePreventDefault
      evt.stopPropagation(); // enableStopPropagation
      
      this.isDoubleTap = this.isTap;
      this.isDragging = true;
      this.isTap = true;
      this.touchStartTime = Date.now();
      
      this.touchStartX = (this.touchsupport) ? evt.touches[0].pageX : evt.pageX;
      this.touchStartY = (this.touchsupport) ? evt.touches[0].pageY : evt.pageY;
      
      this.emit('touchstart', {
        'touchStartTime': this.touchStartTime,
        'touchStartX'   : this.touchStartX,
        'touchStartY'   : this.touchStartY,
      });
      
      //return false; // enableReturnFalse
    };
    
    this.ontouchMove = (evt) => {
      if (!this.isDragging) return;
      this.lasttouchX = this.touchX || this.touchStartX;
      this.lasttouchY = this.touchY || this.touchStartY;
      
      this.touchX = (this.touchsupport) ? evt.touches[0].pageX : evt.pageX;
      this.touchY = (this.touchsupport) ? evt.touches[0].pageY : evt.pageY;
      this.deltaX = this.touchX - this.lasttouchX;
      this.deltaY = this.touchY - this.lasttouchY;
      this.moveX  = this.touchX - this.touchStartX;
      this.moveY  = this.touchY - this.touchStartY;
      
      this.isTap = this.isDoubleTap = false;
      
      this.emit('touchmove', {
        'lasttouchX': this.lasttouchX,
        'lasttouchY': this.lasttouchY,
        'touchX'    : this.touchX,
        'touchY'    : this.touchY,
        'deltaX'    : this.deltaX,
        'deltaY'    : this.deltaY,
        'moveX'     : this.moveX,
        'moveY'     : this.moveY,
      });
      
      // clearTimeout(movingtimer);
      // movingtimer = setTimeout(function(){ this.isDragging = false; },1000);
    };
    
    this.onTouchEnd = (evt) => {
      this.isDragging = false;
      
      this.elapsedTime = Date.now() - this.touchStartTime;
      this.touchEndX = this.touchX;
      this.touchEndY = this.touchY;
      
      this.emit('touchend', {
        'elapsedTime': this.elapsedTime,
        'touchEndX'  : this.touchEndX,
        'touchEndY'  : this.touchEndY,
        'moveX'      : this.moveX,
        'moveY'      : this.moveY,
        'isTap'      : this.isTap,
        'isDoubleTap': this.isDoubleTap,
      });
      
      this.touchX = this.touchY = null;
      this.moveX = this.moveY = 0;
      setTimeout(() => {
        this.isTap = this.isDoubleTap = false;
      }, this.doubleTapDelay);
    };
  }
}
