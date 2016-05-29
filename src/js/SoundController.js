import Cookies from 'js-cookie';

export default class SoundController {
    constructor(opts = {}) {
        
        this.COOKIE_NAME = opts.COOKIE_NAME || "isMute";
        this.EXPIRES_DATE = opts.EXPIRES_DATE;
        this.disableBlurPause = !!opts.disableBlurPause;
        this.toggleSelector = opts.toggleSelector;
        
        this.SE = {};
        
        this.audio = new Audio(opts.src);
        this.audio.volume = 0.2;
        this.audio.loop = !opts.disableLoop;
        
        this.initListeners();
    }
    
    initListeners() {
        $(this.toggleSelector).on('click', () => {
            this.toggleMute().pause().play();
        });

        if (!this.disableBlurPause) {
            $(window).on('blur', () => {
                this.pause();
            }).on('focus', () => {
                this.play();
            });
        }
    }
    
    play() {
        if (this.audio.muted) return this;
        this.audio.play();
        return this;
    }
    
    pause() {
        this.audio.pause();
        return this;
    }
    
    togglePlay(flag) {
        if (flag === undefined) {
            flag = !this.audio.paused;
        }
        flag ? this.play() : this.pause();
        return this;
    }
    
    mute() {
        this.audio.muted = true;
        this.setCookie(this.audio.muted);
        return this;
    }
    
    unmute() {
        this.audio.muted = false;
        this.setCookie(this.audio.muted);
        return this;
    }
    
    toggleMute(flag) {
        if (flag === undefined) {
            flag = !this.getCookie();
        }
        flag ? this.mute() : this.unmute();
        return this;
    }
    
    setSE(key, src) {
        // if (Const.IS_TOUCH) return this;
        this.SE[key] = new Audio(src);
        return this;
    }
    
    playSE(key) {
        if (this.audio.muted) return this;
        // if (Const.IS_TOUCH) return this;
        
        let se = this.SE[key];
        if (!se) return this;
        
        se.play();
        return this;
    }
    
    setCookie(value) {
        return Cookies.set(this.COOKIE_NAME, value, { expires: this.EXPIRES_DATE });
    }
    
    getCookie() {
        let value = Cookies.get(this.COOKIE_NAME);
        return (value === "true");
    }
    
    hasCookie() {
        return Cookies.get(this.COOKIE_NAME) !== undefined;
    }
}
