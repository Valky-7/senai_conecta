document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFeed();
});

async function loadFeed() {
    const feed = document.getElementById('feed');
    try {
        const posts = await apiFetch('/publicacoes');
        feed.innerHTML = posts.map(post => renderPost(post)).join('');
    } catch (err) {
        feed.innerHTML = `<p class="error">Erro ao carregar o feed.</p>`;
    }
}

function renderPost(post) {
    const user = JSON.parse(localStorage.getItem('usuario') || 'null');
    const isOwner = user && user.id_usuario === post.id_usuario;
    const isLiked = post.curtido_pelo_usuario == 1;

    return `
        <div class="post-card" id="post-${post.id_publicacao}">
            <div class="post-header">
                <div>
                    <span class="post-author clickable" data-username="${escapeHtml(post.username)}" onclick="openProfile(this.dataset.username)">${escapeHtml(post.nome)}</span>
                    <span style="color:#777">@${escapeHtml(post.username)}</span>
                </div>
                ${isOwner ? `<button class="btn" onclick="deletePost(${post.id_publicacao})">Excluir</button>` : ''}
            </div>
            <p>${escapeHtml(post.texto)}</p>
            ${post.imagem ? `<img src="${API_BASE_URL}/uploads/${post.imagem}" class="post-image">` : ''}
            <div class="post-actions">
                <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id_publicacao})">
                <img src="${API_BASE_URL}/uploads/curtir.svg" class="icon-like">
                ${post.total_curtidas}
                </button>
                <small style="color:#888">${new Date(post.datahora_publicacao).toLocaleString('pt-BR')}</small>
            </div>
        </div>
    `;
}

async function toggleLike(idPublicacao) {
    if (!localStorage.getItem('token')) {
        openAuthModal();
        return;
    }

    try {
        await apiFetch('/curtir', {
            method: 'POST',
            body: JSON.stringify({ id_publicacao: idPublicacao })
        });
        loadFeed();
    } catch (err) {
        alert(err.message);
    }
}

async function deletePost(idPublicacao) {
    if (!confirm('Deseja realmente excluir esta publicação?')) return;

    try {
        await apiFetch(`/publicacoes/${idPublicacao}`, { method: 'DELETE' });
        loadFeed();
    } catch (err) {
        alert(err.message);
    }
}

document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('texto', document.getElementById('postText').value);
    
    const img = document.getElementById('postImage').files[0];
    if (img) formData.append('imagem', img);

    try {
        await apiFetch('/publicacoes', { method: 'POST', body: formData });
        document.getElementById('postForm').reset();
        loadFeed();
    } catch (err) {
        alert(err.message);
    }
});

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[match]));
}

// ===== PERFIL DO USUARIO =====

// Busca o perfil na API e abre a janela (modal) com os dados
async function openProfile(username) {
    try {
        // encodeURIComponent deixa o username seguro para ir na URL
        const perfil = await apiFetch(`/usuarios/${encodeURIComponent(username)}`);
        document.getElementById('profileContent').innerHTML = renderProfile(perfil);
        document.getElementById('profileModal').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
}

// Fecha a janela do perfil
function closeProfile() {
    document.getElementById('profileModal').classList.add('hidden');
}

// Monta o HTML do perfil com os dados que vieram da API
function renderProfile(perfil) {
    // Foto so aparece se o usuario tiver uma; se o arquivo nao existir, usa o avatar.png
    const foto = perfil.foto
        ? `<img class="profile-photo" src="${API_BASE_URL}/uploads/${escapeHtml(perfil.foto)}"
               onerror="this.onerror=null; this.src='${API_BASE_URL}/uploads/avatar.png'">`
        : '';

    // Lista das publicacoes do proprio usuario (ou aviso se nao tiver nenhuma)
    const publicacoes = perfil.publicacoes.length > 0
        ? perfil.publicacoes.map(post => `
            <div class="post-card">
                <p>${escapeHtml(post.texto)}</p>
                ${post.imagem ? `<img src="${API_BASE_URL}/uploads/${escapeHtml(post.imagem)}" class="post-image">` : ''}
                <div class="post-actions">
                    <span class="like-count"><img src="${API_BASE_URL}/uploads/curtir.svg" class="icon-like"> ${post.total_curtidas}</span>
                    <small style="color:#888">${new Date(post.datahora_publicacao).toLocaleString('pt-BR')}</small>
                </div>
            </div>
        `).join('')
        : '<p style="color:#777">Este usuário ainda não fez publicações.</p>';

    // Monta e devolve o HTML final do perfil
    return `
        <button class="profile-close" onclick="closeProfile()">
            <img src="${API_BASE_URL}/uploads/fechar.svg" class="icon-close">
        </button>

        <div class="profile-top">
            ${foto}
            <h2>${escapeHtml(perfil.nome)}</h2>
            <span style="color:#777">@${escapeHtml(perfil.username)}</span>
        </div>

        <div class="profile-stats">
            <div><strong>${perfil.total_publicacoes}</strong><span>Publicações</span></div>
            <div><strong>${perfil.total_curtidas_recebidas}</strong><span>Curtidas recebidas</span></div>
        </div>

        <h3>Publicações</h3>
        ${publicacoes}
    `;
}

// Pesquisa: ao apertar Enter no campo, abre o perfil do @username digitado
document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        // Tira espacos e o @ do comeco
        const username = e.target.value.trim().replace(/^@/, '');
        if (username) openProfile(username);
    }
});