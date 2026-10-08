// ARQUIVO PRINCIPAL DO FRONTEND: feed, curtir, excluir, publicar e perfil

// Quando a página terminar de carregar
document.addEventListener('DOMContentLoaded', () => {
    // Ajusta o menu e o formulário conforme o login
    checkAuth();
    // Busca e mostra as publicações
    loadFeed();
});

// Busca as publicações na API e desenha o feed na tela
async function loadFeed() {
    // Pega a área onde o feed aparece
    const feed = document.getElementById('feed');
    try {
        // Chama a rota GET /publicacoes
        const posts = await apiFetch('/publicacoes');
        // Transforma cada publicação em HTML (map) e junta tudo em um texto só (join)
        feed.innerHTML = posts.map(post => renderPost(post)).join('');
    } catch (err) {
        // Se der erro, mostra uma mensagem no lugar do feed
        feed.innerHTML = `<p class="error">Erro ao carregar o feed.</p>`;
    }
}

// Monta o HTML de UMA publicação
function renderPost(post) {
    // Pega os dados do usuário logado guardados no navegador
    const user = JSON.parse(localStorage.getItem('usuario') || 'null');
    // true se o usuário logado é o dono da publicação (para mostrar o botão Excluir)
    const isOwner = user && user.id_usuario === post.id_usuario;
    // true se o usuário logado já curtiu esta publicação
    const isLiked = post.curtido_pelo_usuario == 1;

    // Devolve o HTML da publicação (os ${...} colocam os valores dentro do texto)
    return `
        <div class="post-card" id="post-${post.id_publicacao}">
            <div class="post-header">
                <div>
                    <!-- Nome do autor: ao clicar abre o perfil. escapeHtml evita código malicioso -->
                    <span class="post-author clickable" data-username="${escapeHtml(post.username)}" onclick="openProfile(this.dataset.username)">${escapeHtml(post.nome)}</span>
                    <span style="color:#777">@${escapeHtml(post.username)}</span>
                </div>
                <!-- Botão Excluir só aparece para o dono da publicação -->
                ${isOwner ? `<button class="btn" onclick="deletePost(${post.id_publicacao})">Excluir</button>` : ''}
            </div>
            <!-- Texto da publicação -->
            <p>${escapeHtml(post.texto)}</p>
            <!-- Imagem só aparece se a publicação tiver uma -->
            ${post.imagem ? `<img src="${API_BASE_URL}/uploads/${post.imagem}" class="post-image">` : ''}
            <div class="post-actions">
                <!-- Botão de curtir: fica vermelho (liked) se o usuário já curtiu -->
                <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id_publicacao})">
                    <img src="${API_BASE_URL}/uploads/curtir.svg" class="icon-like">
                    ${post.total_curtidas}
                </button>
                <!-- Data e hora da publicação no formato brasileiro -->
                <small style="color:#888">${new Date(post.datahora_publicacao).toLocaleString('pt-BR')}</small>
            </div>
        </div>
    `;
}

// Curtir ou descurtir uma publicação
async function toggleLike(idPublicacao) {
    // Se não está logado, abre a janela de login e para
    if (!localStorage.getItem('token')) {
        openAuthModal();
        return;
    }

    try {
        // Chama a rota POST /curtir enviando o id da publicação
        await apiFetch('/curtir', {
            method: 'POST',
            body: JSON.stringify({ id_publicacao: idPublicacao })
        });
        // Recarrega o feed para atualizar o número de curtidas
        loadFeed();
    } catch (err) {
        // Mostra o erro em uma janelinha
        alert(err.message);
    }
}

// Excluir uma publicação
async function deletePost(idPublicacao) {
    // Pergunta se tem certeza; se cancelar, para aqui
    if (!confirm('Deseja realmente excluir esta publicação?')) return;

    try {
        // Chama a rota DELETE /publicacoes/{id}
        await apiFetch(`/publicacoes/${idPublicacao}`, { method: 'DELETE' });
        // Recarrega o feed sem a publicação apagada
        loadFeed();
    } catch (err) {
        alert(err.message);
    }
}

// Quando o formulário "Criar Publicação" for enviado
document.getElementById('postForm').addEventListener('submit', async (e) => {
    // Impede a página de recarregar
    e.preventDefault();
    // FormData permite enviar texto e imagem juntos
    const formData = new FormData();
    // Adiciona o texto digitado
    formData.append('texto', document.getElementById('postText').value);

    // Pega a imagem escolhida (undefined se não escolheu)
    const img = document.getElementById('postImage').files[0];
    // Só adiciona a imagem se existir
    if (img) formData.append('imagem', img);

    try {
        // Envia para a rota POST /publicacoes
        await apiFetch('/publicacoes', { method: 'POST', body: formData });
        // Limpa o formulário
        document.getElementById('postForm').reset();
        // Recarrega o feed com a nova publicação
        loadFeed();
    } catch (err) {
        // Mostra o erro (ex.: perfil sem permissão para publicar)
        alert(err.message);
    }
});

// Protege contra código malicioso: troca símbolos especiais por texto seguro
function escapeHtml(text) {
    // Procura os símbolos & < > " ' e troca cada um pelo seu código seguro
    return text.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[match]));
}

// ===== PERFIL DO USUÁRIO =====

// Busca o perfil na API e abre a janela (modal) com os dados
async function openProfile(username) {
    try {
        // encodeURIComponent deixa o username seguro para ir na URL
        const perfil = await apiFetch(`/usuarios/${encodeURIComponent(username)}`);
        // Coloca o HTML do perfil dentro da janela
        document.getElementById('profileContent').innerHTML = renderProfile(perfil);
        // Mostra a janela do perfil
        document.getElementById('profileModal').classList.remove('hidden');
    } catch (err) {
        // Mostra o erro (ex.: usuário não encontrado)
        alert(err.message);
    }
}

// Fecha a janela do perfil
function closeProfile() {
    // Esconde a janela
    document.getElementById('profileModal').classList.add('hidden');
}

// Monta o HTML do perfil com os dados que vieram da API
function renderProfile(perfil) {
    // Foto só aparece se o usuário tiver uma; se o arquivo não existir, usa o avatar.png
    const foto = perfil.foto
        ? `<img class="profile-photo" src="${API_BASE_URL}/uploads/${escapeHtml(perfil.foto)}"
               onerror="this.onerror=null; this.src='${API_BASE_URL}/uploads/avatar.png'">`
        : '';

    // Lista das publicações do próprio usuário (ou aviso se não tiver nenhuma)
    const publicacoes = perfil.publicacoes.length > 0
        ? perfil.publicacoes.map(post => `
            <div class="post-card">
                <p>${escapeHtml(post.texto)}</p>
                ${post.imagem ? `<img src="${API_BASE_URL}/uploads/${escapeHtml(post.imagem)}" class="post-image">` : ''}
                <div class="post-actions">
                    <!-- Quantidade de curtidas com o ícone curtir.svg -->
                    <span class="like-count"><img src="${API_BASE_URL}/uploads/curtir.svg" class="icon-like"> ${post.total_curtidas}</span>
                    <small style="color:#888">${new Date(post.datahora_publicacao).toLocaleString('pt-BR')}</small>
                </div>
            </div>
        `).join('')
        : '<p style="color:#777">Este usuário ainda não fez publicações.</p>';

    // Monta e devolve o HTML final do perfil
    return `
        <!-- Botão de fechar com o ícone fechar.svg -->
        <button class="profile-close" onclick="closeProfile()">
            <img src="${API_BASE_URL}/uploads/fechar.svg" class="icon-close">
        </button>

        <!-- Foto, nome e @username -->
        <div class="profile-top">
            ${foto}
            <h2>${escapeHtml(perfil.nome)}</h2>
            <span style="color:#777">@${escapeHtml(perfil.username)}</span>
        </div>

        <!-- Quantidade de publicações e de curtidas recebidas -->
        <div class="profile-stats">
            <div><strong>${perfil.total_publicacoes}</strong><span>Publicações</span></div>
            <div><strong>${perfil.total_curtidas_recebidas}</strong><span>Curtidas recebidas</span></div>
        </div>

        <!-- Lista das publicações do usuário -->
        <h3>Publicações</h3>
        ${publicacoes}
    `;
}

// Pesquisa: ao apertar Enter no campo, abre o perfil do @username digitado
document.getElementById('searchInput').addEventListener('keydown', (e) => {
    // Só age se a tecla for Enter
    if (e.key === 'Enter') {
        // Tira espaços e o @ do começo
        const username = e.target.value.trim().replace(/^@/, '');
        // Se sobrou algum texto, abre o perfil
        if (username) openProfile(username);
    }
});
