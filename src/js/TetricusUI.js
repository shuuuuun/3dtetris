import { EventEmitter2 } from 'eventemitter2';

export default class TetricusUI extends EventEmitter2 {
  constructor(controller) {
    super();
    
    this.controller = controller;
    this.$modalPause = $('.js-modal-pause');
    this.$modalGameover = $('.js-modal-gameover');
    this.$modalStart = $('.js-modal-start');
    this.$modalHowto = $('.js-modal-howto');
    this.$modalResult = $('.js-modal-result');
    this.$modals = this.$modalPause.add(this.$modalGameover).add(this.$modalStart).add(this.$modalHowto).add(this.$modalResult);
    this.$btnModalClose = $('.js-btn-modal-close');
    this.$btnResume = $('.js-btn-resume');
    this.$btnStart = $('.js-btn-start');
    this.$btnPause = $('.js-btn-pause');
    this.$btnSound = $('.js-btn-sound');
    this.$btnToResult = $('.js-btn-to-result');
    this.$btnToHowto = $('.js-btn-to-howto');
    this.$btnToBack = $('.js-btn-to-back');
    this.$btnRotateVertical = $('.js-btn-rotate-vertical');
    this.$btnRotateHorizontal = $('.js-btn-rotate-horizontal');
    this.$btnRotate = this.$btnRotateVertical.add(this.$btnRotateHorizontal);
    this.$tapAreaTop = $('.js-tap-area-top');
    this.$tapAreaLeft = $('.js-tap-area-left');
    this.$tapAreaRight = $('.js-tap-area-right');
    this.$tapAreaBottom = $('.js-tap-area-bottom');
    this.$slideHowto = $('.js-slide-howto');
    this.$slideDots = $('.js-slide-dots');
    
    this.setEvent();
    this.setControllerEvent();
    this.setHowto();
  }
  
  setEvent() {
    $('button').on('touchstart', (evt) => {
      // touch event bug fix
      // cf. http://jsdo.it/shuuuuun/WLX1
      evt.stopPropagation();
    });
    this.$btnPause.on('click', () => {
      this.$btnPause.toggleClass('is-active');
      this.$modalPause.show();
      
      if (this.controller.isPlayngGame) {
        this.controller.pauseGame();
      }
      else {
        this.controller.resumeGame();
      }
    });
    this.$btnSound.on('click', () => {
      this.toggleBtnSound();
      let isSoundOn = this.$btnSound.hasClass('is-sound-on');
      
      this.emit('toggleSound', {
        isSoundOn: isSoundOn,
      });
    });
    this.$btnRotateVertical.on('touchstart', () => {
      this.controller.rotateBlockVertical();
    });
    this.$btnRotateHorizontal.on('touchstart', () => {
      this.controller.rotateBlockHorizontal();
    });
    this.$btnModalClose.on('click', () => {
      this.$modals.hide();
    });
    this.$btnResume.on('click', () => {
      if (this.controller.isAutoMode) {
        this.controller.isAutoMode = false;
        this.controller.resumeLastGame();
      }
      else {
        this.controller.resumeGame();
      }
    });
    this.$btnStart.on('click', () => {
      this.controller.isAutoMode = false;
      this.controller.newGame();
    });
    this.$btnToResult.on('click', () => {
      this.$modals.hide();
      this.$modalResult.show();
    });
    this.$btnToHowto.on('click', () => {
      this.$modals.hide();
      this.$modalHowto.show();
      this.$modalHowto.removeClass('is-touch-none');
      if (this.controller.isAutoMode) {
        this.controller.setTutorialMode();
        this.$modalHowto.addClass('is-touch-none');
        return;
      }
      if (this.controller.isPlayngGame) {
        this.controller.pauseGame();
      }
    });
    this.$btnToBack.on('click', () => {
      this.backModal();
    });
  }
  
  setControllerEvent() {
    const ACTIVE_CLASSNAME = 'is-active';
    const TAP_FB_DURATION = 500;
    
    this.controller.on('pauseGame', () => {
      if (this.isModalShown()) {
        // なにかしらmodalが既に表示されてたらreturn
        return;
      }
      this.$modalPause.show();
    });
    this.controller.on('resumeGame', () => {
      if (this.controller.isAutoMode || this.controller.isTutorialMode) {
        return;
      }
      this.$modals.hide();
    });
    this.controller.on('gameover', () => {
      if (this.isModalShown() || this.controller.isAutoMode) {
        return;
      }
      this.$modalResult.show();
    });
    this.controller.on('taptop', () => {
      this.$tapAreaTop.addClass(ACTIVE_CLASSNAME);
      setTimeout(() => this.$tapAreaTop.removeClass(ACTIVE_CLASSNAME), TAP_FB_DURATION);
    });
    this.controller.on('tapleft', () => {
      this.$tapAreaLeft.addClass(ACTIVE_CLASSNAME);
      setTimeout(() => this.$tapAreaLeft.removeClass(ACTIVE_CLASSNAME), TAP_FB_DURATION);
    });
    this.controller.on('tapright', () => {
      this.$tapAreaRight.addClass(ACTIVE_CLASSNAME);
      setTimeout(() => this.$tapAreaRight.removeClass(ACTIVE_CLASSNAME), TAP_FB_DURATION);
    });
    this.controller.on('tapbottom', () => {
      this.$tapAreaBottom.addClass(ACTIVE_CLASSNAME);
      setTimeout(() => this.$tapAreaBottom.removeClass(ACTIVE_CLASSNAME), TAP_FB_DURATION);
    });
  }
  
  setHowto() {
    const ACTIVE_CLASSNAME = 'is-active';
    const INDEX_DATANAME = 'data-slide-index';
    const $items = this.$slideHowto.children();
    const $dots = this.$slideDots.children();
    const length = $items.length;
    let index = +this.$modalHowto.attr(INDEX_DATANAME) || 0;
    $items.hide().first().show();
    
    // TODO: もうちょいリファクタ
    const nextSlide = () => {
      ++index;
      if (index >= length) {
        index = 0;
        this.backModal();
      }
      $items.hide().eq(index).show();
      $dots.removeClass(ACTIVE_CLASSNAME).eq(index).addClass(ACTIVE_CLASSNAME);
      this.$modalHowto.attr(INDEX_DATANAME, index);
    };
    
    this.$modalHowto.on('click', nextSlide);
    this.controller.on('touchend', (evt) => {
      if (!this.controller.isTutorialMode) {
        return;
      }
      if (index === 0 && evt.isBlockMoved) {
        nextSlide();
      }
    });
    this.controller.on('stickTouchend', (evt) => {
      if (!this.controller.isTutorialMode) {
        return;
      }
      if (index === 1 && evt.isStickMoved) {
        nextSlide();
      }
    });
    this.$btnRotate.on('click', (evt) => {
      if (!this.controller.isTutorialMode) {
        return;
      }
      if (index === 2) {
        nextSlide();
      }
    });
  }
  
  backModal() {
    this.$modals.hide();
    if (!this.controller.isPausingGame) {
      this.$modalStart.show();
      this.controller.setAutoMode();
    }
    else {
      this.controller.resumeGame();
    }
  }
  
  showStartModal() {
    this.$modalStart.show();
  }
  
  isModalShown() {
    return this.$modals.get().some(modal => $(modal).is(':visible'));
  }
  
  toggleBtnSound(flag) {
    this.$btnSound.toggleClass('is-sound-on', flag);
  }
}
