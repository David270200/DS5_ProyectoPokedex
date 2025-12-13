/*
 * =========================================================
 * ARCHIVO: shared.js
 * DESCRIPCIÓN: Módulo IIFE para gestionar localStorage (Caché, Favoritos, Histórico).
 * =========================================================
 */

const StorageModule = (function() {
    // 24 horas * 60 minutos * 60 segundos * 1000 milisegundos
    const CACHE_TTL = 24 * 60 * 60 * 1000; 
    const HISTORY_KEY = 'pokemon_history';
    const FAVORITES_KEY = 'pokemon_favorites';

    /**
     * @description Verifica si un dato en localStorage es válido y no ha expirado.
     * @param {string} key - Clave del dato a verificar (ej: 'cache_pokemon_bulbasaur').
     * @returns {object | null} - El dato si es válido, o null si está expirado/no existe.
     */
    function getValidCache(key) {
        const storedItem = localStorage.getItem(key);
        if (!storedItem) {
            return null;
        }

        const data = JSON.parse(storedItem);
        const now = new Date().getTime();

        // Verificar expiración solo si tiene timestamp
        if (data.timestamp && (now - data.timestamp > CACHE_TTL)) {
            console.log(`Cache expirado para: ${key}`);
            localStorage.removeItem(key); // Limpiar el cache expirado
            return null;
        }

        return data.value;
    }

    /**
     * @description Guarda un dato en localStorage, opcionalmente con un timestamp (para caché).
     * @param {string} key - Clave del dato.
     * @param {*} value - Valor a guardar.
     * @param {boolean} useTTL - Si se debe añadir un timestamp de expiración (Usar true solo para datos de API).
     */
    function setItem(key, value, useTTL = false) {
        const dataToStore = {
            value: value,
        };

        if (useTTL) {
            dataToStore.timestamp = new Date().getTime();
        }

        localStorage.setItem(key, JSON.stringify(dataToStore));
    }

    /**
     * @description Obtiene datos NO CACHEABLES (Histórico, Favoritos) que son solo arrays.
     */
    function getPersistentData(key) {
        const storedItem = localStorage.getItem(key);
        if (!storedItem) {
            return [];
        }
        try {
            return JSON.parse(storedItem).value || [];
        } catch (e) {
            console.error(`Error al parsear ${key}:`, e);
            return [];
        }
    }

    return {
        // Funciones para Caché con TTL
        getCache: getValidCache,
        setCache: (key, value) => setItem(key, value, true),

        // Funciones para Favoritos/Histórico (Arrays de IDs o Nombres)
        getFavorites: () => getPersistentData(FAVORITES_KEY),
        setFavorites: (data) => setItem(FAVORITES_KEY, data),
        getHistory: () => getPersistentData(HISTORY_KEY),
        setHistory: (data) => setItem(HISTORY_KEY, data),

        remove: (key) => localStorage.removeItem(key),
        clearAll: () => localStorage.clear(), 
        KEYS: { HISTORY: HISTORY_KEY, FAVORITES: FAVORITES_KEY }
    };

})();