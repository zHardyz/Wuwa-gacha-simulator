import { GachaSystem } from './modules/GachaSystem.js';
import { UIManager } from './modules/UIManager.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Iniciando Sistema Convene de Wuthering Waves...");
    
    const system = new GachaSystem();
    const ui = new UIManager(system);

    // Initial setup complete
    console.log("Sistema pronto.");
});
