/*
 * =========================================================
 * ARCHIVO: shared.js
 * DESCRIPCIÓN: Módulo IIFE para gestionar localStorage (Caché, Favoritos, Histórico).
 * ROL: Ingeniero JavaScript
 * =========================================================
 */

const StorageModule = (function() {
    // Definición de constantes
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

    /**
     * @description Verifica si un dato en localStorage es válido y no ha expirado.
     * @param {string} key - Clave del dato a verificar.
     * @returns {object | null} - El dato si es válido, o null si está expirado/no existe.
     */
    function getValidData(key) {
        const storedItem = localStorage.getItem(key);
        if (!storedItem) {
            return null;
        }

        const data = JSON.parse(storedItem);
        const now = new Date().getTime();

        // Si es un dato cacheadO con TTL
        if (data.timestamp && (now - data.timestamp > CACHE_TTL)) {
            console.log(`Cache expirado para: ${key}`);
            localStorage.removeItem(key); // Limpiar el cache expirado
            return null;
        }

        // Si es un dato válido (Favoritos/Histórico no usan timestamp) o cache fresco
        return data.value;
    }

    /**
     * @description Guarda un dato en localStorage, opcionalmente con un timestamp (para caché).
     * @param {string} key - Clave del dato.
     * @param {*} value - Valor a guardar.
     * @param {boolean} useTTL - Si se debe añadir un timestamp de expiración.
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

    // Exponer solo las funciones públicas
    return {
        get: getValidData,
        set: setItem,
        remove: (key) => localStorage.removeItem(key),
        clearAll: () => localStorage.clear(), // Usado para limpieza total (histórico/favoritos)
    };

})();

/*
 * NOTA PARA EL INGENIERO JAVASCRIPT:
 * 1. Implementar la lógica de Favoritos y Histórico usando las funciones de este módulo.
 * 2. Usar get/set con useTTL=true para la caché de las peticiones a la PokeAPI.
 */