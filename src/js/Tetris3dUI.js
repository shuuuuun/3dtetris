import { EventEmitter2 } from 'eventemitter2';

export default class Tetris3dUI extends EventEmitter2 {
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
    this.$btnToResult = $('.js-btn-to-result');
    this.$btnToHowto = $('.js-btn-to-howto');
    this.$btnToBack = $('.js-btn-to-back');
    this.$btnRotateVertical = $('.js-btn-rotate-vertical');
    this.$btnRotateHorizontal = $('.js-btn-rotate-horizontal');
    
    this.setEvent();
    this.setControllerEvent();
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
      this.$modals.hide();
    });
    this.controller.on('gameover', () => {
      if (this.isModalShown() || this.controller.isAutoMode) {
        return;
      }
      this.$modalGameover.show();
    });
  }
  
  showStartModal() {
    this.$modalStart.show();
  }
  
  isModalShown() {
    return this.$modals.get().some(modal => $(modal).is(':visible'));
  }
}
