import { BannerConfig } from './BannerConfig.js';

export class UIManager {
    constructor(system) {
        this.system = system;
        this.elements = {
            // Top Bar
            crystalCount: document.getElementById('crystal-count'),
            astriteTimer: document.getElementById('astrite-timer'),
            afterburnCount: document.getElementById('afterburn-count'),
            scrapCount: document.getElementById('scrap-count'),
            
            // Sidebar
            bannerList: document.getElementById('banner-list'),
            
            // Main Banner Area
            bgLayer: document.getElementById('background-layer'),
            bannerTitle: document.getElementById('banner-title'),
            bannerDesc: document.getElementById('banner-desc'), // New
            bannerTimer: document.querySelector('.banner-timer'), // New: Pity Display
            featuredName: document.getElementById('featured-name'),
            rateUpList: document.getElementById('rate-up-list'),
            elementIcon: document.getElementById('element-icon'), // New
            
            // Actions
            summon1Btn: document.getElementById('summon-1-btn'),
            summon10Btn: document.getElementById('summon-10-btn'),
            bannerDetailsBtn: document.getElementById('banner-details-btn'), // New

            // Overlays
            summonOverlay: document.getElementById('summon-overlay'),
            videoPlaceholder: document.getElementById('video-placeholder'),
            summonStars: document.getElementById('summon-stars'),
            detailsModal: document.getElementById('details-modal'), // New
            detailsList: document.getElementById('details-list'), // New
            closeDetailsBtn: document.getElementById('close-details-btn'), // New
            
            // Reveal Modal
            revealModal: document.getElementById('reveal-modal'),
            revealImg: document.getElementById('reveal-img'),
            revealFlash: document.querySelector('.reveal-flash'), // New
            revealName: document.getElementById('reveal-name'),
            revealRarity: document.getElementById('reveal-rarity'),
            revealType: document.getElementById('reveal-type'),
            revealCurrency: document.getElementById('reveal-currency'),
            revealClickArea: document.querySelector('.reveal-click-area'),

            // Results Grid
            summonResults: document.getElementById('summon-results'),
            resultsGrid: document.getElementById('results-grid'),
            closeResultsBtn: document.getElementById('close-results-btn'),
        };

        this.currentRevealQueue = [];
        this.currentRevealIndex = 0;
        this.isRevealing = false;
        this.isSummoning = false;
        this.summonTimers = [];
        this.sounds = {
            click: new Audio('assets/sons/som-de-click.wav'),
            clickPremios: new Audio('assets/sons/som-de-click-premios.wav'),
            click5: new Audio('assets/sons/som-de-click-5estrelas.wav')
        };
        this.astriteTimerKey = 'astrite_timer_end';
        this.astriteTimerId = null;

        this.init();
    }

    init() {
        this.system.onUpdate((data) => this.updateCurrency(data));
        this.renderBannerList();
        this.selectBanner(BannerConfig.banners[0].id);
        // Initial Update
        this.updateCurrency({
            crystals: this.system.crystals,
            afterburn: this.system.afterburn,
            scrap: this.system.scrap,
            pityState: this.system.pityState
        });

        this.elements.summon1Btn.addEventListener('click', () => {
            this.playSound('click');
            this.handleSummon(1);
        });
        this.elements.summon10Btn.addEventListener('click', () => {
            this.playSound('click');
            this.handleSummon(10);
        });
        this.elements.closeResultsBtn.addEventListener('click', () => this.closeResults());
        
        // Banner Details Events
        if (this.elements.bannerDetailsBtn) {
            this.elements.bannerDetailsBtn.addEventListener('click', () => {
                this.playSound('click');
                this.openBannerDetails();
            });
        }
        if (this.elements.closeDetailsBtn) {
            this.elements.closeDetailsBtn.addEventListener('click', () => this.closeBannerDetails());
        }

        // Use the click area for advancing reveals
        this.elements.revealClickArea.addEventListener('click', () => this.advanceReveal());
        this.initAstriteTimer();
    }

    // New Method: Open Banner Details
    openBannerDetails() {
        const currentBannerId = this.system.currentBanner ? this.system.currentBanner.id : null;
        const banner = BannerConfig.banners.find(b => b.id === currentBannerId);
        if (!banner) return;

        this.elements.detailsList.innerHTML = '';
        this.elements.detailsModal.classList.remove('hidden');

        const info = document.createElement('div');
        info.className = 'details-note';
        info.innerHTML = `
            <h3>Regra 50/50</h3>
            <p>Ao obter um 5★ neste banner, há 50% de chance de ser Aemeath (personagem do banner) e 50% de chance de ser Encore (mochileiro). Se vier Encore, o próximo 5★ do banner é garantido Aemeath.</p>
        `;
        this.elements.detailsList.appendChild(info);

        // Helper to render a group
        const renderGroup = (title, items, className) => {
            if (items.length === 0) return;
            const groupDiv = document.createElement('div');
            groupDiv.className = `rate-group ${className}`;
            groupDiv.innerHTML = `<h3>${title}</h3>`;
            
            items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <img src="${item.image || 'assets/images/NADA.webp'}" alt="${item.name}">
                    <span class="item-name">${item.name}</span>
                    <span class="item-type">${item.type === 'resonator' ? 'Resonador' : item.type === 'weapon' ? 'Arma' : 'Item'}</span>
                `;
                groupDiv.appendChild(row);
            });
            this.elements.detailsList.appendChild(groupDiv);
        };

        // Categorize Items
        // Note: In a real system, you'd filter by what's actually in the pool. 
        // Here we assume standard items are in all pools + limited specific logic
        
        // 5 Stars
        let pool5 = BannerConfig.items.filter(i => i.rarity === 5);
        if (banner.type === 'limited_character') {
            // Filter to only show the rate up + standard 5 stars (excluding other limiteds if we had them)
            // For now, assuming all non-rate-up 5 stars are standard.
        }
        renderGroup("★★★★★ (Taxa Base: 0.8%)", pool5, "r5");

        // 4 Stars
        const pool4 = BannerConfig.items.filter(i => i.rarity === 4);
        renderGroup("★★★★ (Taxa Base: 6.0%)", pool4, "r4");

        // 3 Stars
        const pool3 = BannerConfig.items.filter(i => i.rarity === 3);
        renderGroup("★★★ (Taxa Base: 93.2%)", pool3, "r3");
    }

    closeBannerDetails() {
        this.elements.detailsModal.classList.add('hidden');
    }

    updateCurrency(data) {
        this.elements.crystalCount.textContent = data.crystals;
        if(this.elements.afterburnCount) this.elements.afterburnCount.textContent = data.afterburn;
        if(this.elements.scrapCount) this.elements.scrapCount.textContent = data.scrap;

        // Pity Update
        if (this.elements.bannerTimer) {
             const pity = data.pityState ? data.pityState.pity5 : 0;
             this.elements.bannerTimer.innerHTML = `<span class="timer-icon">✦</span> Convene: ${pity}/80`;
        }
    }

    initAstriteTimer() {
        if (!this.elements.astriteTimer) return;
        const now = Date.now();
        let end = Number(localStorage.getItem(this.astriteTimerKey));
        if (!Number.isFinite(end) || end <= now) {
            end = now + 10 * 60 * 1000;
            localStorage.setItem(this.astriteTimerKey, String(end));
        }

        const update = () => {
            const current = Date.now();
            let remaining = end - current;
            if (remaining <= 0) {
                this.system.addCrystals(1600);
                end = Date.now() + 10 * 60 * 1000;
                localStorage.setItem(this.astriteTimerKey, String(end));
                remaining = end - Date.now();
            }
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            this.elements.astriteTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        update();
        if (this.astriteTimerId) clearInterval(this.astriteTimerId);
        this.astriteTimerId = setInterval(update, 1000);
    }

    renderBannerList() {
        this.elements.bannerList.innerHTML = '';
        BannerConfig.banners.forEach(banner => {
            const item = document.createElement('div');
            item.className = 'banner-item';
            item.dataset.id = banner.id;
            
            // Icon based sidebar
            item.innerHTML = `
                <div class="banner-item-thumb">
                    <img class="banner-item-img" src="${banner.image}" alt="${banner.title}">
                </div>
                <span class="banner-item-tag">EVENT</span>
            `;
            item.addEventListener('click', () => {
                this.playSound('click');
                this.selectBanner(banner.id);
            });
            this.elements.bannerList.appendChild(item);
        });
    }

    selectBanner(bannerId) {
        const banner = this.system.selectBanner(bannerId);
        if (!banner) return;

        // Active State
        document.querySelectorAll('.banner-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === bannerId);
        });

        // Update Content
        this.elements.bannerTitle.textContent = banner.title;
        if(this.elements.bannerDesc) this.elements.bannerDesc.textContent = banner.description;
        this.elements.bgLayer.style.backgroundImage = `url('${banner.image}')`;
        
        // Find featured 5* name for the name plate
        if (banner.rateUp5 && banner.rateUp5.length > 0) {
            const featuredResonator = BannerConfig.items.find(i => i.id === banner.rateUp5[0]);
            if (featuredResonator) {
                this.elements.featuredName.textContent = featuredResonator.name;
                if (this.elements.elementIcon) this.elements.elementIcon.textContent = '✦';
            }
        }

        // Render Rate Up 4-Stars
        this.elements.rateUpList.innerHTML = '';
        if (banner.rateUp4) {
            banner.rateUp4.forEach(id => {
                const item = BannerConfig.items.find(i => i.id === id);
                if (item) {
                    const div = document.createElement('div');
                    div.className = 'rate-up-item';
                    const img = document.createElement('img');
                    img.className = 'rate-up-img';
                    img.src = item.image;
                    div.appendChild(img);
                    this.elements.rateUpList.appendChild(div);
                }
            });
        }
    }

    handleSummon(count) {
        if (this.isSummoning) return;

        const result = this.system.summon(count);
        if (!result.success) {
            alert(result.message);
            return;
        }

        this.isSummoning = true;
        this.updateSummonButtonsState();
        this.playSummonAnimation(result.results);
    }

    playSummonAnimation(results) {
        const maxRarity = Math.max(...results.map(r => r.item.rarity));
        this.applySummonTheme(maxRarity);
        this.clearSummonTimers();

        const count = Math.max(1, Math.min(5, maxRarity));
        const appearDuration = 160;
        const gap = 80;
        const perStar = appearDuration + gap;
        const lastAppear = (count - 1) * perStar + appearDuration;
        const hold = 450;
        const fade = 200;

        this.buildSummonStars(count, appearDuration, gap);

        this.elements.summonResults.classList.add('hidden');
        this.elements.revealModal.classList.add('hidden');
        this.elements.summonOverlay.classList.remove('hidden');
        this.elements.videoPlaceholder.style.display = 'flex';
        this.elements.summonStars.classList.remove('fade-out');

        this.summonTimers.push(setTimeout(() => {
            this.elements.summonStars.classList.add('fade-out');
        }, lastAppear + hold));

        this.summonTimers.push(setTimeout(() => {
            this.elements.videoPlaceholder.style.display = 'none';
            this.startRevealSequence(results);
        }, lastAppear + hold + fade));
    }

    applySummonTheme(rarity) {
        let color = '#ffffff';
        let glowColor = 'rgba(255, 255, 255, 0)';
        let glowSize = '0px';
        let glowPeak = '0px';

        if (rarity === 3) {
            color = '#4aa3ff';
        } else if (rarity === 4) {
            color = '#b472ff';
        } else if (rarity === 5) {
            color = '#ffd36a';
            glowColor = 'rgba(255, 211, 106, 0.85)';
            glowSize = '18px';
            glowPeak = '28px';
        }

        this.elements.videoPlaceholder.style.setProperty('--star-color', color);
        this.elements.videoPlaceholder.style.setProperty('--star-glow-color', glowColor);
        this.elements.videoPlaceholder.style.setProperty('--star-glow-size', glowSize);
        this.elements.videoPlaceholder.style.setProperty('--star-glow-peak', glowPeak);
    }

    clearSummonTimers() {
        this.summonTimers.forEach(timer => clearTimeout(timer));
        this.summonTimers = [];
    }

    buildSummonStars(count, appearDuration, gap) {
        const container = this.elements.summonStars;
        if (!container) return;

        container.innerHTML = '';
        container.style.setProperty('--appear-duration', `${appearDuration}ms`);

        for (let i = 0; i < count; i++) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.classList.add('summon-star');
            svg.style.setProperty('--delay', `${i * (appearDuration + gap)}ms`);

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '50,5 61,35 95,35 67,57 78,90 50,70 22,90 33,57 5,35 39,35');
            svg.appendChild(polygon);

            container.appendChild(svg);
        }
    }

    startRevealSequence(results) {
        this.currentRevealQueue = results;
        this.currentRevealIndex = 0;
        this.isRevealing = true;
        this.elements.revealModal.classList.remove('hidden');
        this.showCurrentReveal();
    }

    showCurrentReveal() {
        if (this.currentRevealIndex >= this.currentRevealQueue.length) {
            this.finishRevealSequence();
            return;
        }

        const data = this.currentRevealQueue[this.currentRevealIndex];
        const item = data.item;
        const isNada = item.id === 'item_nada';
        this.elements.revealModal.classList.toggle('reveal-nada', isNada);

        // Reset Animations
        this.resetAnimation(this.elements.revealImg, isNada ? 'nadaReveal 0.35s ease-out forwards' : 'revealZoomIn 0.8s ease-out forwards 0.2s');
        this.resetAnimation(this.elements.revealName, 'slideRightFade 0.4s ease-out forwards 0.5s');
        this.resetAnimation(this.elements.revealRarity, 'slideRightFade 0.4s ease-out forwards 0.4s');
        this.resetAnimation(this.elements.revealType, 'slideRightFade 0.4s ease-out forwards 0.6s');
        this.resetAnimation(this.elements.revealCurrency, 'slideRightFade 0.4s ease-out forwards 0.7s');
        
        // Trigger Flash
        if (this.elements.revealFlash) {
            this.resetAnimation(this.elements.revealFlash, 'flashBang 0.6s ease-out forwards');
        }

        // Set Content
        this.elements.revealImg.src = item.image || '';
        this.elements.revealName.textContent = item.name;
        this.elements.revealRarity.textContent = "★".repeat(item.rarity);
        
        // Rarity Color Classes
        this.elements.revealRarity.className = 'reveal-rarity'; // reset
        this.elements.revealRarity.classList.add(`r${item.rarity}`);

        this.elements.revealType.textContent = item.type === 'resonator' ? 'RESONADOR' : item.type === 'weapon' ? 'ARMA' : 'ITEM';

        let currencyText = "";
        if (data.currency.afterburn > 0) currencyText += `+${data.currency.afterburn} Coral `;
        if (data.currency.scrap > 0) currencyText += `+${data.currency.scrap} Fragmentos`;
        if (data.evolutionItem) currencyText += ` | +1 Material de Evolução`;
        this.elements.revealCurrency.textContent = currencyText;

        if (item.rarity === 5) {
            this.playSound('click5');
        }
    }

    resetAnimation(element, animationValue) {
        element.style.animation = 'none';
        void element.offsetWidth; // Trigger reflow
        element.style.animation = animationValue;
    }

    advanceReveal() {
        if (!this.isRevealing) return;
        const nextIndex = this.currentRevealIndex + 1;
        const nextItem = this.currentRevealQueue[nextIndex]?.item;
        if (!nextItem || nextItem.rarity !== 5) {
            this.playSound('clickPremios');
        }
        this.currentRevealIndex++;
        this.showCurrentReveal();
    }

    finishRevealSequence() {
        this.isRevealing = false;
        this.elements.revealModal.classList.add('hidden');
        this.showSummary(this.currentRevealQueue);
    }

    showSummary(results) {
        this.elements.summonResults.classList.remove('hidden');
        this.elements.resultsGrid.innerHTML = '';
        
        results.forEach((data, index) => {
            const item = data.item;
            const card = document.createElement('div');
            // Always use card style for all rarities, just differentiate by border/glow
            card.className = `result-card rarity-${item.rarity === 5 ? 'ssr' : item.rarity === 4 ? 'sr' : 'r'} delay-${index}`;
            
            const img = document.createElement('img');
            img.className = 'card-img';
            // Fallback image for parts/items that might not have an image
            img.src = item.image || 'assets/images/default-part.jpg'; 
            
            const name = document.createElement('div');
            name.className = 'card-name';
            name.textContent = item.name;

            // Optional: Add star display to card
            const stars = document.createElement('div');
            stars.className = 'card-stars';
            stars.textContent = "★".repeat(item.rarity);
            
            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(stars);
            this.elements.resultsGrid.appendChild(card);
        });
    }

    closeResults() {
        this.elements.summonOverlay.classList.add('hidden');
        this.isSummoning = false;
        this.updateSummonButtonsState();
    }

    playSound(name) {
        const sound = this.sounds[name];
        if (!sound) return;
        sound.currentTime = 0;
        const result = sound.play();
        if (result && typeof result.catch === 'function') {
            result.catch(() => {});
        }
    }

    updateSummonButtonsState() {
        const btns = [this.elements.summon1Btn, this.elements.summon10Btn];
        btns.forEach(btn => {
            if (this.isSummoning) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }
}
