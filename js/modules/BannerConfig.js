export const BannerConfig = {
    banners: [
        {
            id: "banner_featured_resonator",
            title: "Distant May the Starlights Be",
            description: "A cada 10 summons, você garante um item de 4★ ou superior. Um Ressonador de 5★ é garantido em até 80 summons.",
            image: "assets/images/aemeath-5-estrelas.jpg",
            type: "limited_character",
            rateUp5: ["resonator_aemeath"],
            rateUp4: ["resonator_danjin"]
        }
    ],
    items: [
        // --- 5★ RESONATORS (0.8%) ---
        { id: "resonator_aemeath", name: "Aemeath", rarity: 5, type: "resonator", image: "assets/images/aemeath-5-estrelas.jpg" },
        { id: "resonator_encore", name: "Encore", rarity: 5, type: "resonator", image: "assets/images/encore-5-estrelas.jpeg" },

        // --- 4★ RESONATORS (Part of 6.0% pool) ---
        { id: "resonator_danjin", name: "Danjin", rarity: 4, type: "resonator", image: "assets/images/danjin-4-estrelas.jpg" },

        // --- 3★ ITEM (93.2%) ---
        { id: "item_nada", name: "NADA", rarity: 3, type: "item", image: "assets/images/NADA.webp" }
    ]
};
