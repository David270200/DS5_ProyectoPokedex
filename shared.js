const StorageModule = (function () {

    const API_BASE = 'https://pokeapi.co/api/v2';
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const HISTORY_KEY = 'pokemon_history';
    const FAVORITES_KEY = 'pokemon_favorites';

    const TYPE_CHART = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, bug: 0.5, rock: 2, steel: 2 },
    flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

function getEffectiveness(attackerTypes, defenderTypes) {
    let totalMult = 1;
    attackerTypes.forEach(atk => {
        defenderTypes.forEach(def => {
            if (TYPE_CHART[atk] && TYPE_CHART[atk][def]) {
                totalMult *= TYPE_CHART[atk][def];
            }
        });
    });
    return totalMult;
}

    /* STORAGE HELPERS */

    function getValidCache(key) {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const data = JSON.parse(stored);
        if (data.timestamp && Date.now() - data.timestamp > CACHE_TTL) {
            localStorage.removeItem(key);
            return null;
        }
        return data.value;
    }

    function setCache(key, value) {
        localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
    }

    function getArray(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data).value : [];
    }

    function setArray(key, value) {
        localStorage.setItem(key, JSON.stringify({ value }));
    }


    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar Histórico si existe el contenedor
        if (document.getElementById('history-list')) {
            renderHistoryPage();
            return;
        }

        // Elementos de la página principal
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const searchType = document.getElementById('searchType');
        const results = document.getElementById('results');
        const loading = document.getElementById('loading');
        const errorBox = document.getElementById('error');

        if (!searchBtn) return;

        /* los eventos de búsqueda */

        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) return;
            searchType.value === 'pokemon' ? searchPokemon(query) : searchAbility(query);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });

        async function searchPokemon(query) {
    resetUI();
    showLoading(true);
    try {
        let data;
        let source = 'api';
        
        // busca en el cache (ya sea por nombre o por ID)
        const cached = getValidCache(`cache_pokemon_${query}`);

        if (cached) {
            data = cached;
            source = 'cache';
        } else {
            // Si no está, va a la API
            const res = await fetch(`${API_BASE}/pokemon/${query}`);
            if (!res.ok) throw new Error();
            data = await res.json();

            // Guardael Pokémon con su nombre
            setCache(`cache_pokemon_${data.name.toLowerCase()}`, data);
            
            // Guarda el mismo objeto usando su ID
            setCache(`cache_pokemon_${data.id}`, data);
        }
        
        renderPokemon(data, source);
        addToHistory(data.name);
    } catch (err) {
        showError('❌ Pokémon no encontrado');
    } finally {
        showLoading(false);
    }
}

        async function searchAbility(query) {
            resetUI();
            showLoading(true);
            try {
                const res = await fetch(`${API_BASE}/ability/${query}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                renderAbility(data);
            } catch {
                showError('❌ Habilidad no encontrada');
            } finally {
                showLoading(false);
            }
        }

        /* RENDERIZADO DE COMPONENTES */

        async function renderPokemon(pokemon, source) {
            const isFav = getArray(FAVORITES_KEY).includes(pokemon.name);
            results.innerHTML = `
                <article class="pokemon-card">
                    <span class="badge ${source}">${source.toUpperCase()}</span>
                    <div class="img-container">
                        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
                    </div>
                    <h2>#${pokemon.id} ${pokemon.name.toUpperCase()}</h2>
                    <div class="types">
                        ${pokemon.types.map(t => `<span class="type">${t.type.name.toUpperCase()}</span>`).join('')}
                    </div>
                    <p style="font-weight:bold; font-size:0.7rem; margin-left: -375px;">HABILIDADES</p>
                    <div class="abilities-container">
                        ${pokemon.abilities.map(a => `
                            <div class="ability-badge ${a.is_hidden ? 'ability-hidden' : 'ability-normal'}">
                                ${a.ability.name.toUpperCase()} ${a.is_hidden ? '(Oculta)' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="stats-container">
                        ${pokemon.stats.map(s => {
                            const pct = Math.min((s.base_stat / 150) * 100, 100);
                            return `
                                <div class="stat-row">
                                    <span class="stat-label">${s.stat.name}</span>
                                    <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
                                </div>`;
                        }).join('')}
                    </div>
                    <button class="btn-fav">${isFav ? '❤️' : '🤍'}</button>
                    <div id="evolution-section" class="evolution-chain">Cargando evoluciones...</div>
                </article>`;

            results.querySelector('.btn-fav').onclick = () => {
                toggleFavorite(pokemon.name);
                renderPokemon(pokemon, source);
            };
            fetchEvolutionChain(pokemon.species.url);
        }

        async function fetchEvolutionChain(speciesUrl) {
            try {
                const spec = await fetch(speciesUrl).then(r => r.json());
                const evo = await fetch(spec.evolution_chain.url).then(r => r.json());
                const evoSection = document.getElementById('evolution-section');
                evoSection.innerHTML = `<p style="font-weight:bold; font-size:0.8rem; margin-bottom:10px;">CADENA EVOLUTIVA</p>`;
                
                const wrapper = document.createElement('div');
                wrapper.className = 'evo-wrapper';
                
                // LÓGICA DE NODOS AGRUPADOS
                function processNode(node) {
                    const nodeDiv = document.createElement('div');
                    nodeDiv.className = 'evo-node';

                    const id = node.species.url.split('/').filter(Boolean).pop();
                    const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

                    // Pokémon actual del nodo
                    nodeDiv.innerHTML = `
                        <div class="evo-step">
                            <img src="${imgUrl}" alt="${node.species.name}">
                            <strong>${node.species.name.toUpperCase()}</strong>
                        </div>
                    `;

                    // Evento de clic
                    nodeDiv.querySelector('.evo-step').onclick = () => {
                        searchInput.value = node.species.name;
                        searchBtn.click();
                    };

                    // Si tiene evoluciones (ramas)
                    if (node.evolves_to.length > 0) {
                        const arrow = document.createElement('div');
                        arrow.className = 'evo-arrow';
                        arrow.innerText = '➡️';
                        nodeDiv.appendChild(arrow);

                        const branches = document.createElement('div');
                        branches.className = 'evo-branches';

                        node.evolves_to.forEach(childNode => {
                            branches.appendChild(processNode(childNode));
                        });

                        nodeDiv.appendChild(branches);
                    }

                    return nodeDiv;
                }

                wrapper.appendChild(processNode(evo.chain));
                evoSection.appendChild(wrapper);
            } catch (e) { 
                console.error("Error evoluciones:", e);
                document.getElementById('evolution-section').innerHTML = ''; 
            }
        }

        async function renderAbility(ability) {
            const desc = ability.effect_entries.find(e => e.language.name === 'es')?.effect 
                        || ability.effect_entries.find(e => e.language.name === 'en')?.effect 
                        || "Sin descripción.";

            results.innerHTML = `
                <article class="ability-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h2>✨ ${ability.name.toUpperCase()}</h2>
                        <span class="badge api">#${ability.id}</span>
                    </div>
                    <div class="effect-box"><h3>EFECTO</h3><p>${desc}</p></div>
                    <p style="font-weight:bold; font-size:0.8rem;">POKÉMON CON ESTA HABILIDAD (${ability.pokemon.length})</p>
                    <div class="pokemon-grid-container"><div class="pokemon-grid" id="ability-grid"></div></div>
                </article>`;

            const grid = document.getElementById('ability-grid');
            for (const p of ability.pokemon) {
                const id = p.pokemon.url.split('/').filter(Boolean).pop();
                const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
                
                const item = document.createElement('div');
                item.className = 'grid-item';
                item.innerHTML = `<img src="${imgUrl}"><strong>${p.pokemon.name.toUpperCase()}</strong>`;
                item.onclick = () => {
                    searchInput.value = p.pokemon.name;
                    searchType.value = 'pokemon';
                    searchBtn.click();
                };
                grid.appendChild(item);
            }
        }

        function resetUI() { results.innerHTML = ''; errorBox.classList.add('hidden'); }
        function showLoading(show) { loading.classList.toggle('hidden', !show); }
        function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }

        function addToHistory(name) {
            let hist = getArray(HISTORY_KEY).filter(p => p !== name);
            hist.unshift(name);
            setArray(HISTORY_KEY, hist.slice(0, 20)); 
        }

        function toggleFavorite(name) {
            let favs = getArray(FAVORITES_KEY);
            favs.includes(name) ? favs = favs.filter(f => f !== name) : favs.push(name);
            setArray(FAVORITES_KEY, favs);
        }
    });

    /* PÁGINA DE HISTÓRICO*/
    async function renderHistoryPage() {
        const list = document.getElementById('history-list');
        const emptyMsg = document.getElementById('empty-list-message');
        const clearBtn = document.getElementById('clear-history-btn');
        const history = getArray(HISTORY_KEY);
        const favs = getArray(FAVORITES_KEY);

        list.innerHTML = '';

        if (history.length === 0) {
            emptyMsg.innerHTML = `<div class="empty-state-card"><h3>📜 VACÍO</h3></div>`;
            emptyMsg.classList.remove('hidden');
            clearBtn.classList.add('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');
        clearBtn.classList.remove('hidden');

        for (const name of history) {
            try {
                let pData = getValidCache(`cache_pokemon_${name}`);
                if (!pData) pData = await fetch(`${API_BASE}/pokemon/${name}`).then(r => r.json());
                
                const isFav = favs.includes(name);
                const li = document.createElement('li');
                li.className = 'history-card';
                li.innerHTML = `
                    <div class="history-img-box"><img src="${pData.sprites.front_default}"></div>
                    <div class="history-info"><h3>#${pData.id} ${name.toUpperCase()}</h3></div>
                    <div class="history-actions">
                        <button class="btn-action btn-fav-hist">${isFav ? '❤️' : '🤍'}</button>
                        <button class="btn-action btn-del-hist">🗑️</button>
                    </div>`;

                li.querySelector('.btn-del-hist').onclick = () => {
                    setArray(HISTORY_KEY, getArray(HISTORY_KEY).filter(p => p !== name));
                    renderHistoryPage();
                };
                li.querySelector('.btn-fav-hist').onclick = () => {
                    let f = getArray(FAVORITES_KEY);
                    f.includes(name) ? f = f.filter(x => x !== name) : f.push(name);
                    setArray(FAVORITES_KEY, f);
                    renderHistoryPage();
                };
                list.appendChild(li);
            } catch (e) { console.error(e); }
        }

        clearBtn.onclick = () => {
            if (confirm('¿Vaciar historial?')) { setArray(HISTORY_KEY, []); renderHistoryPage(); }
        };
    }

/* Dentro del DOMContentLoaded */

let pokemonData1 = null;
let pokemonData2 = null;

const checkBattleReady = () => {
    const battleBtn = document.getElementById('vs-battle-btn');
    if (pokemonData1 && pokemonData2) {
        battleBtn.classList.remove('hidden');
    } else {
        battleBtn.classList.add('hidden');
    }
};

// Función genérica para buscar en el VS
async function searchForVS(inputIdx) {
    const input = document.getElementById(`vs-input-${inputIdx}`);
    const preview = document.getElementById(`vs-preview-${inputIdx}`);
    const query = input.value.trim().toLowerCase();

    if (!query) return;

    preview.innerHTML = "⏳...";
    
    try {
        let data;
        let source = 'api';
        const cached = getValidCache(`cache_pokemon_${query}`);

        if (cached) {
            data = cached;
            source = 'cache';
        } else {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
            if (!res.ok) throw new Error();
            data = await res.json();
            setCache(`cache_pokemon_${data.name}`, data);
        }

        // Guardamos los datos en la variable global correspondiente
        if (inputIdx === 1) pokemonData1 = data;
        else pokemonData2 = data;

        // Render de la previsualización individual con su badge
        preview.innerHTML = `
            <span class="badge ${source}">${source.toUpperCase()}</span>
            <img src="${data.sprites.front_default}" style="width:80px">
            <h4 style="margin:5px 0">#${data.id} ${data.name.toUpperCase()}</h4>
        `;

        checkBattleReady();
    } catch (e) {
        preview.innerHTML = "❌ No encontrado";
        if (inputIdx === 1) pokemonData1 = null;
        else pokemonData2 = null;
        checkBattleReady();
    }
}

// Listeners para los botones individuales
const btn1 = document.getElementById('vs-search-btn-1');
const btn2 = document.getElementById('vs-search-btn-2');

if (btn1) btn1.onclick = () => searchForVS(1);
if (btn2) btn2.onclick = () => searchForVS(2);

// Lógica del botón Batalla (Comparativa de la imagen)
const battleBtn = document.getElementById('vs-battle-btn');
if (battleBtn) {
    battleBtn.onclick = () => {
        const results = document.getElementById('vs-results');
        results.classList.remove('hidden');

        // RENDERIZAR BARRAS DE ESTADÍSTICAS //
        const statsContainer = document.getElementById('stats-vs-container');
        const labels = ['HP', 'ATK', 'DEF', 'SP.ATK', 'SP.DEF', 'SPD'];
        
        statsContainer.innerHTML = labels.map((label, i) => {
            const v1 = pokemonData1.stats[i].base_stat;
            const v2 = pokemonData2.stats[i].base_stat;
            
            // Cálculo de porcentajes para que las barras se encuentren en el centro
            const total = v1 + v2;
            const p1Pct = (v1 / total) * 100;
            const p2Pct = (v2 / total) * 100;

            return `
                <div class="stat-comparison-row">
                    <span class="stat-value ${v1 > v2 ? 'winner-num' : ''}">${v1}</span>
                    
                    <div class="stat-v-bars">
                        <div class="v-bar left" style="width: ${p1Pct}%"></div>
                        <div class="v-bar-center">${label}</div>
                        <div class="v-bar right" style="width: ${p2Pct}%"></div>
                    </div>
                    
                    <span class="stat-value ${v2 > v1 ? 'winner-num' : ''}">${v2}</span>
                </div>`;
        }).join('');


        //CÁLCULOS DE TIPO Y PUNTAJE//
        const types1 = pokemonData1.types.map(t => t.type.name);
        const types2 = pokemonData2.types.map(t => t.type.name);
        const mult1 = getEffectiveness(types1, types2);
        const mult2 = getEffectiveness(types2, types1);

        const totalStats1 = pokemonData1.stats.reduce((acc, s) => acc + s.base_stat, 0);
        const totalStats2 = pokemonData2.stats.reduce((acc, s) => acc + s.base_stat, 0);

        const score1 = (totalStats1 * mult1).toFixed(1);
        const score2 = (totalStats2 * mult2).toFixed(1);

        // --- 3. HTML DEL ANÁLISIS ---
        const analysisHTML = `
            <div class="analysis-box">
                <h4>⚡ VENTAJAS DE TIPO</h4>
                <div class="type-row ${mult1 < 1 ? 'type-bad' : 'type-good'}">
                    ${pokemonData1.name.toUpperCase()} vs ${pokemonData2.name.toUpperCase()}: <strong>x${mult1.toFixed(2)}</strong>
                </div>
                <div class="type-row ${mult2 < 1 ? 'type-bad' : 'type-good'}">
                    ${pokemonData2.name.toUpperCase()} vs ${pokemonData1.name.toUpperCase()}: <strong>x${mult2.toFixed(2)}</strong>
                </div>
            </div>

            <div class="analysis-box">
                <h4>📊 CÁLCULO DEL PUNTAJE</h4>
                <p><strong>Stats Base Total:</strong> ${pokemonData1.name}: ${totalStats1} | ${pokemonData2.name}: ${totalStats2}</p>
                <p><strong>Multiplicador:</strong> ${pokemonData1.name}: x${mult1} | ${pokemonData2.name}: x${mult2}</p>
                <p class="final-score"><strong>Puntaje Final:</strong> ${pokemonData1.name}: ${score1} pts | ${pokemonData2.name}: ${score2} pts</p>
            </div>
        `;

        document.getElementById('analysis-container').innerHTML = analysisHTML;
        
        // Función opcional por si quieres iluminar la tarjeta del ganador
        if (typeof updateWinnerUI === "function") {
            updateWinnerUI(score1, score2);
        }
    };
}

/* 
   PÁGINA DE FAVORITOS */
async function renderFavoritesPage() {
    const list = document.getElementById('favorites-list');
    const emptyMsg = document.getElementById('empty-fav-message');
    const clearBtn = document.getElementById('clear-favorites-btn');
    const favs = getArray(FAVORITES_KEY);

    if (!list) return; // Si no estamos en la página de favoritos, salir
    list.innerHTML = '';

    if (favs.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    if (clearBtn) clearBtn.classList.remove('hidden');

    // Renderizar cada favorito con el diseño de la imagen
    for (const name of favs) {
        try {
            let pData = getValidCache(`cache_pokemon_${name}`);
            if (!pData) pData = await fetch(`${API_BASE}/pokemon/${name}`).then(r => r.json());

            const div = document.createElement('div');
            div.className = 'fav-card'; // Clase para el CSS
            div.innerHTML = `
                <div class="fav-img-container">
                    <img src="${pData.sprites.front_default}" alt="${name}">
                </div>
                <div class="fav-info">
                    <h3>#${pData.id} ${name.toUpperCase()}</h3>
                    <div class="fav-types">
                        ${pData.types.map(t => `<span class="type-badge-mini">${t.type.name.toUpperCase()}</span>`).join('')}
                    </div>
                </div>
                <button class="btn-delete-fav" data-name="${name}">
                    <img src="https://cdn-icons-png.flaticon.com/512/1214/1214428.png" width="20">
                </button>
            `;

            // Evento para eliminar solo de favoritos
            div.querySelector('.btn-delete-fav').onclick = () => {
                removeFavorite(name);
            };

            list.appendChild(div);
        } catch (e) { console.error("Error cargando favorito:", e); }
    }

    // Botón Limpiar Todo
    clearBtn.onclick = () => {
        if (confirm('¿Eliminar todos los favoritos?')) {
            setArray(FAVORITES_KEY, []);
            renderFavoritesPage();
        }
    };
}

// Función para quitar favorito y refrescar cualquier pantalla abierta
function removeFavorite(name) {
    let favs = getArray(FAVORITES_KEY).filter(f => f !== name);
    setArray(FAVORITES_KEY, favs);
    
    // Si estamos en la página de favoritos, refrescar lista
    if (document.getElementById('favorites-list')) renderFavoritesPage();
    
    // Si estamos en historial, refrescar para que el corazón cambie a blanco
    if (document.getElementById('history-list')) renderHistoryPage();
    
    // Si estamos en búsqueda, podrías llamar a la función de renderizado actual si la tienes guardada
}

// Modifica tu toggleFavorite actual para que use esta lógica:
function toggleFavorite(name) {
    let favs = getArray(FAVORITES_KEY);
    if (favs.includes(name)) {
        favs = favs.filter(f => f !== name);
    } else {
        favs.push(name);
    }
    setArray(FAVORITES_KEY, favs);
    
    // Sincronización inmediata
    if (document.getElementById('favorites-list')) renderFavoritesPage();
}

// INICIALIZACIÓN: Añade esto dentro del DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('favorites-list')) {
        renderFavoritesPage();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderFavoritesPage();

    const clearBtn = document.getElementById('clear-favorites-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('¿Estás seguro de que quieres borrar todos tus favoritos?')) {
                setArray(FAVORITES_KEY, []);
                renderFavoritesPage();
            }
        };
    }
});


async function renderFavoritesPage() {
    const list = document.getElementById('favorites-list');
    const emptyMsg = document.getElementById('empty-list-message');
    const clearBtn = document.getElementById('clear-favorites-btn');
    const favs = getArray(FAVORITES_KEY);

    list.innerHTML = '';

    if (favs.length === 0) {
        emptyMsg.classList.remove('hidden');
        clearBtn.classList.add('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    clearBtn.classList.remove('hidden');

    for (const name of favs) {
        // Obtenemos datos (de cache o API)
        let data = getValidCache(`cache_pokemon_${name}`);
        if (!data) {
            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
                data = await res.json();
            } catch (e) { continue; }
        }

        const li = document.createElement('li');
        li.className = 'fav-card brutalist-element'; 
        li.innerHTML = `
            <div class="fav-content">
                <div class="fav-img-box">
                    <img src="${data.sprites.front_default}" alt="${data.name}">
                </div>
                <div class="fav-text">
                    <span class="fav-id">#${data.id}</span>
                    <h3 class="fav-name">${data.name.toUpperCase()}</h3>
                    <div class="fav-types">
                        ${data.types.map(t => `<span class="type-badge mini ${t.type.name}">${t.type.name.toUpperCase()}</span>`).join('')}
                    </div>
                </div>
            </div>
            <button class="delete-fav-btn" onclick="removeFromFavs('${data.name}')">
                <img src="https://cdn-icons-png.flaticon.com/512/1214/1214428.png" alt="Eliminar">
            </button>
        `;
        list.appendChild(li);
    }
}

// Función global para que el onclick del botón funcione
window.removeFromFavs = (name) => {
    let favs = getArray(FAVORITES_KEY);
    favs = favs.filter(n => n !== name);
    setArray(FAVORITES_KEY, favs);
    renderFavoritesPage();
};

    return { getArray, setArray };
})();