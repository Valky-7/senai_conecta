// ARQUIVO DE AUTENTICAÇÃO: menu do usuário, janela de login/cadastro e logout

// Mostra ou esconde partes da tela conforme o usuário esteja logado ou não
function checkAuth() {
    // Pega o token guardado no navegador (null se não logou)
    const token = localStorage.getItem('token');
    // Pega os dados do usuário guardados (texto JSON) e transforma em objeto
    const user = JSON.parse(localStorage.getItem('usuario') || 'null');
    // Pega a área do menu no topo da página
    const userMenu = document.getElementById('userMenu');
    // Pega o formulário "Criar Publicação"
    const createPostSection = document.getElementById('createPostSection');

    // Se está logado (tem token e dados do usuário)
    if (token && user) {
        // Mostra o @username (abre o perfil ao clicar) e o botão Sair
        userMenu.innerHTML = `
            <button class="btn" data-username="${escapeHtml(user.username)}" onclick="openProfile(this.dataset.username)">@${escapeHtml(user.username)}</button>
            <button class="btn" onclick="logout()">Sair</button>
        `;
        // Só mostra o formulário de publicar se o perfil for "criador"
        if (user.tipo_perfil === 'criador') {
            // Remove a classe hidden para o formulário aparecer
            createPostSection.classList.remove('hidden');
        } else {
            // Perfil "usuario" só interage: esconde o formulário
            createPostSection.classList.add('hidden');
        }
    } else {
        // Não logado: mostra só o botão Entrar
        userMenu.innerHTML = `<button class="btn primary" onclick="openAuthModal()">Entrar</button>`;
        // Visitante não publica: esconde o formulário
        createPostSection.classList.add('hidden');
    }
}

// Abre a janela de login/cadastro
function openAuthModal() {
    // Tira a classe hidden para a janela aparecer
    document.getElementById('authModal').classList.remove('hidden');
}

// Fecha a janela de login/cadastro
function closeAuthModal() {
    // Coloca a classe hidden para a janela sumir
    document.getElementById('authModal').classList.add('hidden');
}

// Troca entre a aba "Login" e a aba "Cadastrar"
function switchTab(tab) {
    // true se a aba escolhida é a de login
    const isLogin = tab === 'login';
    // Mostra o formulário de login só se for a aba login
    document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
    // Mostra o formulário de cadastro só se NÃO for a aba login
    document.getElementById('registerForm').classList.toggle('hidden', isLogin);
    // Marca o botão da aba login como ativo (ou não)
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    // Marca o botão da aba cadastro como ativo (ou não)
    document.getElementById('tabRegister').classList.toggle('active', !isLogin);
}

// Sai da conta
function logout() {
    // Apaga o token do navegador
    localStorage.removeItem('token');
    // Apaga os dados do usuário do navegador
    localStorage.removeItem('usuario');
    // Atualiza o menu e o formulário na tela
    checkAuth();
    // Recarrega o feed (agora como visitante)
    loadFeed();
}

// Quando o formulário de login for enviado
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    // Impede a página de recarregar (comportamento padrão do formulário)
    e.preventDefault();
    // Pega o local onde a mensagem de erro aparece
    const errorDiv = document.getElementById('loginError');
    // Esconde erros antigos
    errorDiv.classList.add('hidden');

    try {
        // Envia e-mail e senha para a rota /login da API
        const res = await apiFetch('/login', {
            method: 'POST',
            // JSON.stringify transforma o objeto em texto JSON
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value,
                senha: document.getElementById('loginSenha').value
            })
        });

        // Guarda o token no navegador para as próximas requisições
        localStorage.setItem('token', res.token);
        // Guarda os dados do usuário (localStorage só guarda texto, por isso o stringify)
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
        // Fecha a janela de login
        closeAuthModal();
        // Atualiza o menu e o formulário de publicar
        checkAuth();
        // Recarrega o feed já logado
        loadFeed();
    } catch (err) {
        // Mostra a mensagem de erro que veio da API
        errorDiv.textContent = err.message;
        // Torna a mensagem visível
        errorDiv.classList.remove('hidden');
    }
});

// Quando o formulário de cadastro for enviado
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    // Impede a página de recarregar
    e.preventDefault();
    // Pega o local da mensagem de erro do cadastro
    const errorDiv = document.getElementById('regError');
    // Esconde erros antigos
    errorDiv.classList.add('hidden');

    // FormData permite enviar texto e arquivo (foto) juntos
    const formData = new FormData();
    // Adiciona cada campo do formulário
    formData.append('nome', document.getElementById('regNome').value);
    formData.append('username', document.getElementById('regUsername').value);
    formData.append('email', document.getElementById('regEmail').value);
    formData.append('senha', document.getElementById('regSenha').value);

    // Pega a foto escolhida (undefined se não escolheu nenhuma)
    const foto = document.getElementById('regFoto').files[0];
    // Só adiciona a foto se o usuário escolheu uma
    if (foto) formData.append('foto', foto);

    try {
        // Envia os dados para a rota /cadastro
        await apiFetch('/cadastro', { method: 'POST', body: formData });
        // Avisa que deu certo
        alert('Cadastro realizado com sucesso! Faça login.');
        // Leva o usuário para a aba de login
        switchTab('login');
    } catch (err) {
        // Mostra o erro (ex.: e-mail já cadastrado)
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
});
