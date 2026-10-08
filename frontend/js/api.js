// Endereço base da API (backend). Todas as chamadas começam por aqui
const API_BASE_URL = 'http://localhost:8080/senai_conecta/backend';

// Função usada em TODO o frontend para conversar com a API
// endpoint = a rota (ex.: '/login'); options = método, corpo etc.
async function apiFetch(endpoint, options = {}) {
    // Pega o token que foi guardado no navegador quando o usuário fez login
    const token = localStorage.getItem('token');
    // Usa os cabeçalhos que vieram nas opções ou começa com um objeto vazio
    const headers = options.headers || {};

    // Se tem token (usuário logado), envia no cabeçalho Authorization
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Se o corpo NÃO for FormData (arquivo), avisa que está enviando JSON
    // (com FormData o próprio navegador define o tipo, por isso não mexemos)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // Faz a requisição para a API (fetch) e espera a resposta (await)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        // Copia as opções recebidas (method, body...)
        ...options,
        // Usa os cabeçalhos que montamos acima
        headers
    });

    // Converte a resposta de JSON para objeto JavaScript
    const data = await response.json();
    // Se o servidor respondeu com erro (401, 404, 500...)
    if (!response.ok) {
        // Lança um erro com a mensagem da API (ou uma mensagem padrão)
        throw new Error(data.erro || 'Erro no processamento da requisição.');
    }
    // Deu tudo certo: devolve os dados para quem chamou
    return data;
}
