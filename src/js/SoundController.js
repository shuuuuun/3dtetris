import Cookies from 'js-cookie';
import { Howl } from 'howler.js';

export default class SoundController {
    constructor(opts = {}) {
        
        this.COOKIE_NAME = opts.COOKIE_NAME || 'isMute';
        this.EXPIRES_DATE = opts.EXPIRES_DATE;
        this.disableBlurPause = !!opts.disableBlurPause;
        
        this.isMute = this.getCookie();
        this.isPaused = false;
        this.isPlayng = false;
        this.toggleMute(this.isMute);
        
        this.sound = new Howl(opts.howl);
        
        this.initListeners();
    }
    
    initListeners() {
        if (!this.disableBlurPause) {
            $(window).on('blur', () => {
                this.pause();
            }).on('focus', () => {
                this.play();
            });
        }
    }
    
    play() {
        if (this.isMute || this.isPlayng) return this;
        this.isPaused = false;
        this.isPlayng = true;
        this.sound.play();
        return this;
    }
    
    pause() {
        this.isPaused = true;
        this.isPlayng = false;
        this.sound.pause();
        return this;
    }
    
    togglePlay(flag) {
        if (flag === undefined) {
            flag = !this.isPaused;
        }
        flag ? this.play() : this.pause();
        return this;
    }
    
    mute() {
        this.isMute = true;
        this.setCookie(this.isMute);
        return this;
    }
    
    unmute() {
        this.isMute = false;
        this.setCookie(this.isMute);
        return this;
    }
    
    toggleMute(flag) {
        if (flag === undefined) {
            flag = !this.getCookie();
        }
        flag ? this.mute() : this.unmute();
        return this;
    }
    
    setCookie(value) {
        return Cookies.set(this.COOKIE_NAME, value, { expires: this.EXPIRES_DATE });
    }
    
    getCookie() {
        let value = Cookies.get(this.COOKIE_NAME);
        return (value === 'true');
    }
    
    hasCookie() {
        return Cookies.get(this.COOKIE_NAME) !== undefined;
    }
}
