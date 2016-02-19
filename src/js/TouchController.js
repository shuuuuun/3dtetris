import $ from 'jquery';
import { EventEmitter2 } from 'eventemitter2';

class TouchController extends EventEmitter2 {
  constructor($element) {
    super();

    this.touchsupport = ("ontouchstart" in window);
    this.touchstart = (this.touchsupport) ? "touchstart" : "mousedown";
    this.touchmove  = (this.touchsupport) ? "touchmove"  : "mousemove";
    this.touchend   = (this.touchsupport) ? "touchend"   : "mouseup";
    
  }
  
  setElement($element) {
    $element
      .on(this.touchstart, onTouchStart)
      .on(this.touchmove, ontouchMove)
      .on(this.touchend, onTouchEnd);
    
    // $(document)
    //   .on(touchstart, function(){ return false; }) // disableDocumentTouch
    //   .on(touchmove, ontouchMove)
    //   .on(touchend, onTouchEnd);
    
    let _this = this;
    
    let isDragging = false,
      movingtimer,
      touchStartX,
      touchStartY,
      lasttouchX,
      lasttouchY,
      touchX,
      touchY,
      deltaX = 0,
      deltaY = 0,
      moveX = 0,
      moveY = 0,
      touchEndX,
      touchEndY,
      touchStartTime,
      elapsedTime;
    
    function onTouchStart(evt){
      evt.preventDefault(); // enablePreventDefault
      isDragging = true;
      touchStartTime = Date.now();
      
      touchStartX = (_this.touchsupport) ? evt.originalEvent.touches[0].pageX : evt.pageX;
      touchStartY = (_this.touchsupport) ? evt.originalEvent.touches[0].pageY : evt.pageY;
      
      // console.log("touchstart");
      _this.emit("touchstart", {
        "touchStartTime": touchStartTime,
        "touchStartX"   : touchStartX,
        "touchStartY"   : touchStartY,
      });
      
      //return false; // enableReturnFalse
    }
    function ontouchMove(evt){
      if (!isDragging) return;
      lasttouchX = touchX || touchStartX;
      lasttouchY = touchY || touchStartY;
      
      touchX = (_this.touchsupport) ? evt.originalEvent.touches[0].pageX : evt.pageX;
      touchY = (_this.touchsupport) ? evt.originalEvent.touches[0].pageY : evt.pageY;
      deltaX = touchX - lasttouchX;
      deltaY = touchY - lasttouchY;
      moveX  = touchX - touchStartX;
      moveY  = touchY - touchStartY;
      
      // console.log("touchmove", touchX, touchY, deltaX, deltaY, moveX, moveY);
      _this.emit("touchmove", {
        "lasttouchX": lasttouchX,
        "lasttouchY": lasttouchY,
        "touchX"    : touchX,
        "touchY"    : touchY,
        "deltaX"    : deltaX,
        "deltaY"    : deltaY,
        "moveX"     : moveX,
        "moveY"     : moveY,
      });
      
      // clearTimeout(movingtimer);
      // movingtimer = setTimeout(function(){ isDragging = false; },1000);
    }
    function onTouchEnd(evt){
      isDragging = false;
      
      elapsedTime = Date.now() - touchStartTime;
      touchEndX = touchX;
      touchEndY = touchY;
      
      // console.log("touchend");
      _this.emit("touchend", {
        "elapsedTime": elapsedTime,
        "touchEndX"  : touchEndX,
        "touchEndY"  : touchEndY,
        "moveX"      : moveX,
        "moveY"      : moveY,
      });
      
      touchX = touchY = null;
      moveX = moveY = 0;
    }
  }
}

module.exports = TouchController;
