export class ProbabilityEngine {
    constructor(config) {
        this.config = config;
        this.RATES = {
            FIVE_STAR: 0.008, // 0.8%
            FOUR_STAR: 0.060, // 6.0%
        };
        this.PITY_CAPS = {
            FIVE_STAR: 80,
            FOUR_STAR: 10
        };
    }

    /**
     * Executes a single pull and returns the result + updated state.
     * @param {Object} banner - The banner configuration.
     * @param {Object} state - The current player state (pity counters, guarantees).
     * @returns {Object} { item, newState }
     */
    roll(banner, state) {
        // Clone state to avoid mutation side effects during calculation
        let newState = { ...state };
        newState.pity5++;
        newState.pity4++;

        let rarity = 3;
        let isRateUp = false;

        // 1. Check 5★ Pity & Rate
        // Hard Pity at 80 OR Random Chance
        const roll5 = Math.random();
        // Wuthering Waves soft pity starts around 60-70, but spec says "0.8% base", "Hard pity 80".
        // We will strictly follow the prompt: 0.8% base, guaranteed at 80.
        // (If user wanted soft pity curve, I'd implement it, but "Hard Pity" usually implies a cap)
        
        const isFiveStar = (newState.pity5 >= this.PITY_CAPS.FIVE_STAR) || (roll5 < this.RATES.FIVE_STAR);

        if (isFiveStar) {
            rarity = 5;
            // Determine if Rate Up (50/50 logic)
            // If banner has rateUp5 defined
            if (banner.rateUp5 && banner.rateUp5.length > 0) {
                if (newState.guarantee5) {
                    isRateUp = true;
                    newState.guarantee5 = false; // Reset guarantee
                } else {
                    // 50/50 chance
                    isRateUp = Math.random() < 0.5;
                    if (!isRateUp) {
                        newState.guarantee5 = true; // Lost 50/50, next is guaranteed
                    }
                }
            }
            // Reset 5* Pity
            newState.pity5 = 0;
            newState.pity4 = 0; 
        } else {
            // 2. Check 4★ Pity & Rate
            // Only check if not 5*
            const roll4 = Math.random();
            // Check if PITY triggered (Hard Pity)
            const isPity4 = newState.pity4 >= this.PITY_CAPS.FOUR_STAR;
            const isFourStar = isPity4 || (roll4 < this.RATES.FOUR_STAR);

            if (isFourStar) {
                rarity = 4;
                // Determine if Rate Up (50/50 logic for 4*)
                if (banner.rateUp4 && banner.rateUp4.length > 0) {
                    if (newState.guarantee4) {
                        isRateUp = true;
                        newState.guarantee4 = false;
                    } else {
                        isRateUp = Math.random() < 0.5;
                        if (!isRateUp) {
                            newState.guarantee4 = true;
                        }
                    }
                }
                // Reset 4* Pity
                newState.pity4 = 0;
            } else {
                rarity = 3;
            }
        }

        const options = {};
        const item = this.selectItem(rarity, isRateUp, banner, options);
        return { item, newState };
    }

    selectItem(rarity, isRateUp, banner, options = {}) {
        let pool = [];

        if (rarity === 5) {
            if (isRateUp && banner.rateUp5 && banner.rateUp5.length > 0) {
                pool = this.config.items.filter(i => banner.rateUp5.includes(i.id));
            } else {
                const rateUpIds = banner.rateUp5 || [];
                pool = this.config.items.filter(i => i.rarity === 5 && !rateUpIds.includes(i.id));
            }
        } else if (rarity === 4) {
            if (isRateUp && banner.rateUp4 && banner.rateUp4.length > 0) {
                pool = this.config.items.filter(i => banner.rateUp4.includes(i.id));
            } else {
                const rateUpIds = banner.rateUp4 || [];
                pool = this.config.items.filter(i => i.rarity === 4 && !rateUpIds.includes(i.id));
            }
        } else {
            // Rarity 3
            pool = this.config.items.filter(i => i.rarity === 3);
        }

        // Safety fallback
        if (pool.length === 0) {
            console.warn(`No items found for rarity ${rarity} (RateUp: ${isRateUp}). Returning random fallback.`);
            return this.config.items.find(i => i.rarity === rarity) || this.config.items[0];
        }

        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex];
    }
}
