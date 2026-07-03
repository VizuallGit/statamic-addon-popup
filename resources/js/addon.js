(function () {
    'use strict';

    // vizuall-popup — shared popup component used by popup-group, column-builder etc.
    // Provides: centered positioning (live-preview aware), dark backdrop, outside-click,
    // escape, scroll-close, teleport to body.
    // API:
    //   props     — title (String), maxWidth (Number, default 560)
    //   #trigger  — scoped slot, exposes { toggle(event), isOpen }
    //   #default  — body content slot, exposes { close }

    Statamic.booting(() => {
        const VizuallPopup = {
            name: 'vizuall-popup',

            props: {
                title:    { type: String, default: '' },
                maxWidth: { type: Number, default: 560 },
            },

            data() {
                return { isOpen: false, popupStyle: { opacity: 0, transform: 'scale(.95)' }, backdropStyle: {} };
            },

            created() {
                this.triggerEl = null;
            },

            methods: {
                // Find the right edge of the CP panel, accounting for a Live Preview iframe.
                cpRight() {
                    let right = window.innerWidth;
                    for (const frame of document.querySelectorAll('iframe')) {
                        const r = frame.getBoundingClientRect();
                        if (r.width > 200 && r.left > window.innerWidth * 0.15 && r.left < right) {
                            right = r.left;
                        }
                    }
                    return right;
                },

                open(el) {
                    this.triggerEl = el || null;

                    // Pre-size at the correct width before render so the browser can
                    // measure the correct height when content loads.
                    const cpRight      = this.cpRight();
                    const desiredWidth = Math.min(this.maxWidth, cpRight - 16);
                    this.popupStyle    = { opacity: 0, transform: 'scale(.95)', width: `${desiredWidth}px` };
                    this.backdropStyle = {};
                    this.isOpen        = true;
                    this._showTimer    = null;
                    this._openedAt     = Date.now();

                    document.body.classList.add('popup-group-open');
                    this.$nextTick(() => {
                        const popup = this.$refs.popup;
                        if (!popup) return;

                        // scheduleShow debounces so we only reveal the popup once the
                        // height has been stable for 60 ms (bard / async fields done).
                        const scheduleShow = () => {
                            clearTimeout(this._showTimer);
                            this._showTimer = setTimeout(() => {
                                this.computePosition();
                                this._ro?.disconnect();
                                this._ro = null;
                                this.bindEvents();
                            }, 60);
                        };

                        if (typeof ResizeObserver !== 'undefined') {
                            this._ro = new ResizeObserver(scheduleShow);
                            this._ro.observe(popup);
                        }

                        // Safety net: always show after 400 ms even if still resizing.
                        setTimeout(() => {
                            if (this.isOpen && !this.popupStyle.opacity) {
                                this.computePosition();
                                this._ro?.disconnect(); this._ro = null;
                                this.bindEvents();
                            }
                        }, 400);

                        scheduleShow(); // trigger once immediately
                    });
                },

                close() {
                    this.isOpen = false;
                    this.popupStyle = { opacity: 0, transform: 'scale(.95)' };
                    document.body.classList.remove('popup-group-open');
                    this.unbindEvents();
                    this.triggerEl = null;
                    clearTimeout(this._showTimer);
                    this._ro?.disconnect();
                    this._ro = null;
                },

                toggle(e) {
                    const el = (e instanceof Event)
                        ? (e.currentTarget ?? e.target)
                        : (e instanceof Element ? e : null);
                    this.isOpen ? this.close() : this.open(el);
                },

                onBackdropMousedown() {
                    // Don't close while a Statamic stack (asset browser, slide-over) is active.
                    if (document.querySelector('.stack-is-current')) return;
                    this.close();
                },

                computePosition() {
                    const popup = this.$refs.popup;
                    if (!popup) return;

                    const cpRight      = this.cpRight();
                    const desiredWidth = Math.min(this.maxWidth, cpRight - 16);
                    const popupH       = popup.offsetHeight;
                    const vh           = window.innerHeight;

                    // Center horizontally within CP panel
                    let left = Math.round(cpRight / 2 - desiredWidth / 2);
                    left = Math.max(8, Math.min(left, cpRight - desiredWidth - 8));

                    // Center vertically
                    let top = Math.round((vh - popupH) / 2);
                    top = Math.max(8, Math.min(top, vh - popupH - 8));

                    this.popupStyle    = { position: 'fixed', zIndex: 3, width: `${desiredWidth}px`, top: `${top}px`, left: `${left}px`, opacity: 1, transform: 'scale(1)' };
                    this.backdropStyle = { position: 'fixed', zIndex: 2, top: 0, left: 0, width: `${cpRight}px`, height: '100vh' };
                },

                bindEvents() {
                    this._onEscape = (e) => { if (e.key === 'Escape') this.close(); };
                    this._onScroll = (e) => {
                        // Grace period: the CP may programmatically expand/scroll to
                        // the section right as the popup opens — don't treat that as
                        // a dismissing scroll.
                        if (Date.now() - (this._openedAt || 0) < 900) return;
                        if (this.triggerEl && e.target?.contains?.(this.triggerEl)) this.close();
                    };
                    document.addEventListener('keydown', this._onEscape);
                    window.addEventListener('scroll',    this._onScroll, true);
                },

                unbindEvents() {
                    if (this._onEscape) document.removeEventListener('keydown', this._onEscape);
                    if (this._onScroll) window.removeEventListener('scroll',    this._onScroll, true);
                },
            },

            beforeUnmount() {
                document.body.classList.remove('popup-group-open');
                this.unbindEvents();
            },

            template: `
                <slot name="trigger" :toggle="toggle" :is-open="isOpen" />

                <teleport to="body">
                    <template v-if="isOpen">
                        <div class="vizuall-popup-backdrop" :style="backdropStyle" @mousedown="onBackdropMousedown" />
                        <div ref="popup" class="vizuall-popup" :style="popupStyle">
                            <div class="vizuall-popup-header">
                                <span class="vizuall-popup-title">{{ title }}</span>
                                <button type="button" class="vizuall-popup-close" @click="close">✕</button>
                            </div>
                            <div class="vizuall-popup-body">
                                <slot :close="close" />
                            </div>
                        </div>
                    </template>
                </teleport>
            `,
        };

        if (!document.getElementById('vizuall-popup-styles')) {
            const s = document.createElement('style');
            s.id = 'vizuall-popup-styles';
            s.textContent = `
                .vizuall-popup-backdrop{background:rgba(0,0,0,.45);animation:vzl-backdrop-in .18s ease;}
                @keyframes vzl-backdrop-in{from{opacity:0;}to{opacity:1;}}
                .vizuall-popup{background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.25);min-width:300px;overflow:hidden;transition:opacity .18s ease,transform .18s ease;}
                .vizuall-popup-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid rgba(0,0,0,.07);}
                .vizuall-popup-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,0,0,.4);}
                .vizuall-popup-close{width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:3px;background:transparent;border:none;cursor:pointer;color:rgba(0,0,0,.35);font-size:12px;}
                .vizuall-popup-close:hover{background:rgba(0,0,0,.08);color:rgba(0,0,0,.7);}
                .vizuall-popup-body{padding:14px;max-height:70vh;overflow-y:auto;}

                html.dark .vizuall-popup{background:#2d2d2d;border-color:#3a3a3a;box-shadow:0 12px 40px rgba(0,0,0,.65);}
                html.dark .vizuall-popup-header{border-bottom-color:rgba(255,255,255,.07);}
                html.dark .vizuall-popup-title{color:rgba(255,255,255,.45);}
                html.dark .vizuall-popup-close{color:rgba(255,255,255,.35);}
                html.dark .vizuall-popup-close:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);}
                html.dark .vizuall-popup-backdrop{background:rgba(0,0,0,.6);}

                body.popup-group-open [data-reka-popper-content-wrapper]{z-index:4!important;}

                /* When a Statamic stack/slide-over (asset browser etc.) is open,
                   drop the popup behind it so the stack is fully interactive. */
                body:has(.stack-is-current) .vizuall-popup { z-index: 1 !important; }
                body:has(.stack-is-current) .vizuall-popup-backdrop { z-index: 0 !important; }
            `;
            document.head.appendChild(s);
        }

        Statamic.$components.register('vizuall-popup', VizuallPopup);
    });
})();
