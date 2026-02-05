import { ProbabilityEngine } from './ProbabilityEngine.js';
import { BannerConfig } from './BannerConfig.js';

export class GachaSystem {
    constructor() {
        this.maxCrystals = 14000;
        this.storageKey = 'gacha_state';
        this.crystals = 14000;
        this.afterburn = 0;
        this.scrap = 0;

        this.inventory = {}; // Map of itemId -> count
        this.probabilityEngine = new ProbabilityEngine(BannerConfig);
        this.currentBanner = BannerConfig.banners[0];

        // Persistent State for Pity (Shared across banners of same type ideally, but simplified here)
        this.pityState = {
            pity5: 0,
            pity4: 0,
            guarantee5: false,
            guarantee4: false
        };

        this.loadState();
    }

    setCrystals(amount) {
        this.crystals = this.clampCrystals(amount);
        this.notifyUpdate();
    }

    addCrystals(amount) {
        this.crystals = this.clampCrystals(this.crystals + amount);
        this.notifyUpdate();
    }

    selectBanner(bannerId) {
        const banner = BannerConfig.banners.find(b => b.id === bannerId);
        if (banner) {
            this.currentBanner = banner;
            // In a full system, we would switch pityState based on banner.type here.
            // For now, we assume shared pity for simplicity as requested "Shared between all featured banners".
            return banner;
        }
        return null;
    }

    summon(count) {
        const cost = count * 160;
        
        if (this.crystals < cost) {
            return { success: false, message: "Cristais insuficientes." };
        }

        this.crystals = this.clampCrystals(this.crystals - cost);
        
        const results = [];
        
        for (let i = 0; i < count; i++) {
            const { item, newState } = this.probabilityEngine.roll(this.currentBanner, this.pityState);
            this.pityState = newState; // Update state immediately for next roll
            
            // Process Rewards & Economy
            const rewardData = this.processObtainedItem(item, this.currentBanner);
            results.push(rewardData);
        }

        this.notifyUpdate();

        return { success: true, results: results };
    }

    processObtainedItem(item, banner) {
        // Initialize inventory count if new
        if (!this.inventory[item.id]) {
            this.inventory[item.id] = 0;
        }
        this.inventory[item.id]++;
        const count = this.inventory[item.id];

        let secondaryBonus = 0;
        let basicBonus = 0;
        let evolutionItem = false;

        // Logic from prompt:
        // 5★
        if (item.rarity === 5) {
            const isRateUp = banner.rateUp5 && banner.rateUp5.includes(item.id);
            
            if (count === 1) {
                secondaryBonus = 15;
            } else if (count >= 2 && count <= 7) {
                secondaryBonus = 15;
                evolutionItem = true;
            } else {
                secondaryBonus = 40;
            }

            // "Caso o 5★ não seja o destaque do banner: conceder bônus adicional de 30"
            if (!isRateUp) {
                secondaryBonus += 30;
            }
        }
        // 4★
        else if (item.rarity === 4) {
            // Check if it is a RESONATOR or WEAPON
            if (item.type === 'resonator') {
                if (count === 1) {
                    secondaryBonus = 3;
                } else if (count >= 2 && count <= 7) {
                    secondaryBonus = 3;
                    evolutionItem = true;
                } else {
                    secondaryBonus = 8;
                }
            } else {
                // WEAPON 4★ (Spec: 3 unidades de moeda secundária)
                secondaryBonus = 3;
                // No evolution item logic specified for parts, assuming just flat currency or standard dupes
            }
        }
        // 3★
        else {
            basicBonus = 15;
        }

        // Apply Currency
        this.afterburn += secondaryBonus;
        this.scrap += basicBonus;

        return {
            item: item,
            isNew: count === 1,
            evolutionItem: evolutionItem,
            currency: {
                afterburn: secondaryBonus,
                scrap: basicBonus
            }
        };
    }

    onUpdate(callback) {
        this.updateCallback = callback;
    }

    notifyUpdate() {
        if (this.updateCallback) {
            this.updateCallback({
                crystals: this.crystals,
                afterburn: this.afterburn,
                scrap: this.scrap,
                pityState: this.pityState
            });
        }
        this.saveState();
    }

    clampCrystals(value) {
        return Math.min(this.maxCrystals, Math.max(0, value));
    }

    loadState() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            if (Number.isFinite(data.crystals)) this.crystals = this.clampCrystals(data.crystals);
            if (Number.isFinite(data.afterburn)) this.afterburn = data.afterburn;
            if (Number.isFinite(data.scrap)) this.scrap = data.scrap;
            if (data.pityState) {
                this.pityState = {
                    pity5: Number.isFinite(data.pityState.pity5) ? data.pityState.pity5 : 0,
                    pity4: Number.isFinite(data.pityState.pity4) ? data.pityState.pity4 : 0,
                    guarantee5: Boolean(data.pityState.guarantee5),
                    guarantee4: Boolean(data.pityState.guarantee4)
                };
            }
        } catch {}
    }

    saveState() {
        const data = {
            crystals: this.crystals,
            afterburn: this.afterburn,
            scrap: this.scrap,
            pityState: this.pityState
        };
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch {}
    }
}
