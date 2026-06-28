(function () {
    'use strict';

    // vizuall-popup — shared popup component used by popup-group, column-builder etc.
    // Provides: positioning, outside-click, escape, scroll-close, teleport to body.
    // API:
    //   props     — title (String), maxWidth (Number, default 500)
    //   #trigger  — scoped slot, exposes { toggle(event), isOpen }
    //   #default  — body content slot, exposes { close }

    Statamic.booting(() => {
        const VizuallPopup = {
            name: 'vizuall-popup',

            props: {
                title:    { type: String,  default: '' },
                maxWidth: { type: Number,  default: 500 },
            },

            data() {
                return { isOpen: false, popupStyle: {} };
            },

            created() {
                this.triggerEl = null;
            },

            methods: {
                open(el) {
                    this.triggerEl = el || null;
                    this.isOpen = true;
                    document.body.classList.add('popup-group-open');
                    this.$nextTick(() => {
                        this.computePosition();
                        setTimeout(() => { this.computePosition(); this.bindEvents(); }, 100);
                    });
                },

                close() {
                    this.isOpen = false;
                    document.body.classList.remove('popup-group-open');
                    this.unbindEvents();
                    this.triggerEl = null;
                },

                toggle(e) {
                    const el = (e instanceof Event)
                        ? (e.currentTarget ?? e.target)
                        : (e instanceof Element ? e : null);
                    this.isOpen ? this.close() : this.open(el);
                },

                computePosition() {
                    const trigger = this.triggerEl;
                    const popup   = this.$refs.popup;
                    if (!trigger || !popup) return;

                    const rect   = trigger.getBoundingClientRect();
                    const popupH = popup.offsetHeight;
                    const popupW = popup.offsetWidth;

                    let top = rect.bottom + 6;
                    if (top + popupH > window.innerHeight - 12) top = Math.max(8, rect.top - popupH - 6);

                    let left = rect.left;
                    if (left + popupW > window.innerWidth - 12) left = Math.max(8, window.innerWidth - popupW - 12);

                    this.popupStyle = { position: 'fixed', zIndex: 3, top: `${top}px`, left: `${left}px` };
                },

                bindEvents() {
                    this._onOutsideClick = (e) => {
                        if (this.$refs.popup?.contains(e.target)) return;
                        if (this.triggerEl?.contains?.(e.target)) return;
                        if (document.querySelector('[data-reka-popper-content-wrapper]')) return;
                        this.close();
                    };
                    this._onEscape = (e) => { if (e.key === 'Escape') this.close(); };
                    this._onScroll = (e) => {
                        if (this.triggerEl && e.target?.contains?.(this.triggerEl)) this.close();
                    };
                    document.addEventListener('mousedown', this._onOutsideClick);
                    document.addEventListener('keydown',   this._onEscape);
                    window.addEventListener('scroll',      this._onScroll, true);
                },

                unbindEvents() {
                    if (this._onOutsideClick) document.removeEventListener('mousedown', this._onOutsideClick);
                    if (this._onEscape)       document.removeEventListener('keydown',   this._onEscape);
                    if (this._onScroll)       window.removeEventListener('scroll',      this._onScroll, true);
                },
            },

            beforeUnmount() {
                document.body.classList.remove('popup-group-open');
                this.unbindEvents();
            },

            template: `
                <slot name="trigger" :toggle="toggle" :is-open="isOpen" />

                <teleport to="body">
                    <div v-if="isOpen" ref="popup" class="vizuall-popup" :style="[popupStyle, { maxWidth: maxWidth + 'px' }]">
                        <div class="vizuall-popup-header">
                            <span class="vizuall-popup-title">{{ title }}</span>
                            <button type="button" class="vizuall-popup-close" @click="close">✕</button>
                        </div>
                        <div class="vizuall-popup-body">
                            <slot :close="close" />
                        </div>
                    </div>
                </teleport>
            `,
        };

        if (!document.getElementById('vizuall-popup-styles')) {
            const s = document.createElement('style');
            s.id = 'vizuall-popup-styles';
            s.textContent = `
                .vizuall-popup{background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.15);min-width:300px;overflow:hidden;}
                .vizuall-popup-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid rgba(0,0,0,.07);}
                .vizuall-popup-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,0,0,.4);}
                .vizuall-popup-close{width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:3px;background:transparent;border:none;cursor:pointer;color:rgba(0,0,0,.35);font-size:12px;}
                .vizuall-popup-close:hover{background:rgba(0,0,0,.08);color:rgba(0,0,0,.7);}
                .vizuall-popup-body{padding:14px;max-height:60vh;overflow-y:auto;}

                html.dark .vizuall-popup{background:#2d2d2d;border-color:#3a3a3a;box-shadow:0 8px 32px rgba(0,0,0,.55);}
                html.dark .vizuall-popup-header{border-bottom-color:rgba(255,255,255,.07);}
                html.dark .vizuall-popup-title{color:rgba(255,255,255,.45);}
                html.dark .vizuall-popup-close{color:rgba(255,255,255,.35);}
                html.dark .vizuall-popup-close:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);}

                body.popup-group-open [data-reka-popper-content-wrapper]{z-index:4!important;}
            `;
            document.head.appendChild(s);
        }

        Statamic.$components.register('vizuall-popup', VizuallPopup);
    });
})();
