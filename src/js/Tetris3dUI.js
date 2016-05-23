import { EventEmitter2 } from 'eventemitter2';

export default class Tetris3dUI extends EventEmitter2 {
  constructor(controller) {
    super();
    
    this.controller = controller;
    this.$modalPause = $('.js-modal-pause');
    this.$modalGameover = $('.js-modal-gameover');
    this.$modalStart = $('.js-modal-start');
    this.$modalHowto = $('.js-modal-howto');
    this.$modalHowtoSecond = $('.js-modal-howto-second');
    this.$modalHowtoThird = $('.js-modal-howto-third');
    this.$modalResult = $('.js-modal-result');
    this.$modals = this.$modalPause.add(this.$modalGameover).add(this.$modalStart).add(this.$modalHowto).add(this.$modalHowtoSecond).add(this.$modalHowtoThird).add(this.$modalResult);
    this.$btnModalClose = $('.js-btn-modal-close');
    this.$btnResume = $('.js-btn-resume');
    this.$btnStart = $('.js-btn-start');
    this.$btnPause = $('.js-btn-pause');
    this.$btnToResult = $('.js-btn-to-result');
    this.$btnToHowto = $('.js-btn-to-howto');
    this.$btnToBack = $('.js-btn-to-back');
    this.$btnRotateVertical = $('.js-btn-rotate-vertical');
    this.$btnRotateHorizontal = $('.js-btn-rotate-horizontal');
    this.$slickHowto = $('.js-slick-howto');
    this.$slickDots = $('.js-slick-dots');
    // this.$bgHowto = $('.js-bg-howto');
    
    this.setEvent();
    this.setControllerEvent();
    this.setSlick();
    this.setHowto();
  }
  
  setEvent() {
    $('button').on('touchstart', (evt) => {
      // touch event bug fix
      // cf. http://jsdo.it/shuuuuun/WLX1
      evt.stopPropagation();
    });
    this.$btnPause.on('click', (evt) => {
      this.$btnPause.toggleClass('is-active');
      this.$modalPause.show();
      
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
    this.$btnModalClose.on('click', (evt) => {
      this.$modals.hide();
    });
    this.$btnResume.on('click', (evt) => {
      this.controller.resumeGame();
    });
    this.$btnStart.on('click', (evt) => {
      this.controller.isAutoMode = false;
      this.controller.newGame();
    });
    this.$btnToResult.on('click', (evt) => {
      this.$modals.hide();
      this.$modalResult.show();
    });
    this.$btnToHowto.on('click', (evt) => {
      this.$modals.hide();
      this.$modalHowto.show();
      this.updateSlick();
      if (this.controller.isAutoMode) {
        return;
      }
      if (this.controller.isPlayngGame) {
        this.controller.pauseGame();
      }
    });
    this.$btnToBack.on('click', (evt) => {
      this.$modals.hide();
      if (!this.controller.isPausingGame) {
        this.$modalStart.show();
      }
      else {
        this.controller.resumeGame();
      }
    });
  }
  
  setControllerEvent() {
    this.controller.on('pauseGame', () => {
      if (this.isModalShown()) {
        // なにかしらmodalが既に表示されてたらreturn
        return;
      }
      this.$modalPause.show();
    });
    this.controller.on('resumeGame', () => {
      if (this.controller.isAutoMode) {
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
  }
  
  setHowto() {
    // TODO: あとでやりかた変える
    this.$modalHowto.on('click', () => {
      this.$modals.hide();
      this.$modalHowtoSecond.show();
    });
    this.$modalHowtoSecond.on('click', () => {
      this.$modals.hide();
      this.$modalHowtoThird.show();
    });
    this.$modalHowtoThird.on('click', () => {
      this.$modals.hide();
      this.controller.resumeGame();
    });
  }
  
  setSlick() {
    this.$slickHowto.slick({
      slidesToShow: 1,
      infinite: false,
      fade: false,
      dots: true,
      autoplay: false,
      speed: 1000,
      pauseOnHover: false,
      arrows: false,
      draggable: true,
      appendDots: this.$slickDots,
    });
    this.$slickHowto.on('beforeChange', (event, slick, currentSlide, nextSlide) => {
      // TODO: リファクタリング
      this.$bgHowto.attr('data-slide-index', nextSlide);
    });
  }
  
  updateSlick() {
    this.$slickHowto.slick('slickGoTo', 0);
  }
  
  showStartModal() {
    this.$modalStart.show();
  }
  
  isModalShown() {
    return this.$modals.get().some(modal => $(modal).is(':visible'));
  }
}
