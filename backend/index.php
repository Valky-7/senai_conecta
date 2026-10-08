<?php
// ARQUIVO PRINCIPAL DA API: recebe todas as requisições e escolhe qual rota executar

// ===== CABEÇALHOS (CORS e tipo da resposta) =====
// Deixa o frontend (outro endereço/porta) acessar esta API
header("Access-Control-Allow-Origin: *");
// Métodos HTTP que a API aceita
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
// Cabeçalhos que o frontend pode enviar (Authorization leva o token do login)
header("Access-Control-Allow-Headers: Content-Type, Authorization");
// Toda resposta da API será JSON em UTF-8
header("Content-Type: application/json; charset=UTF-8");

// O navegador manda um OPTIONS antes (pré-requisição); só respondemos OK e paramos
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ===== PREPARAÇÃO =====
// Carrega a classe que conecta no banco
require_once __DIR__ . '/config/database.php';
// Carrega a classe que cria e confere o token JWT
require_once __DIR__ . '/helpers/jwt_helper.php';

// Cria a conexão com o banco (fica na variável $db)
$db = (new Database())->getConnection();
// Pega só o caminho da URL, sem o "?parametros" (ex.: /senai_conecta/backend/login)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Guarda o método da requisição (GET, POST, DELETE...)
$method = $_SERVER['REQUEST_METHOD'];

// Parte fixa da URL que vem antes das rotas
$basePath = '/senai_conecta/backend';

// Se a URL começa com a parte fixa, a gente tira ela (str_starts_with precisa de PHP 8)
if (str_starts_with($uri, $basePath)) {
    // Fica só a rota, ex.: /login
    $uri = substr($uri, strlen($basePath));
}

// Se sobrou vazio, a rota é a raiz
if ($uri === '') {
    $uri = '/';
}

// ===== FUNÇÃO AUXILIAR: descobrir quem está logado =====
// Lê o token do cabeçalho Authorization e devolve os dados do usuário (ou null)
function getAuthenticatedUser(): ?array {
    // Pega todos os cabeçalhos enviados pelo frontend
    $headers = getallheaders();
    // Procura o cabeçalho Authorization (maiúsculo ou minúsculo)
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    // O formato é "Bearer TOKEN"; aqui separamos só o TOKEN
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        // Confere e abre o token; devolve os dados ou null se for inválido
        return JWTHelper::decode($matches[1]);
    }
    // Sem token: ninguém logado
    return null;
}

// ===== ROTA: POST /login =====
if ($uri === '/login' && $method === 'POST') {
    // Lê o JSON enviado pelo frontend e transforma em array
    $data = json_decode(file_get_contents("php://input"), true);
    // Pega o e-mail (trim tira espaços); se não veio, usa texto vazio
    $email = trim($data['email'] ?? '');
    // Pega a senha; se não veio, usa texto vazio
    $senha = $data['senha'] ?? '';

    // Prepara a busca do usuário pelo e-mail (o ? evita SQL Injection)
    $stmt = $db->prepare("SELECT * FROM usuario WHERE email = ?");
    // Executa a busca colocando o e-mail no lugar do ?
    $stmt->execute([$email]);
    // Pega a linha encontrada (ou false se não existir)
    $user = $stmt->fetch();

    // Se achou o usuário e a senha confere (aqui compara direto; em projeto real usaria password_verify)
    if ($user && $senha === $user['senha']) {
        // Cria o token com os dados do usuário
        $token = JWTHelper::encode([
            // Guarda o id dentro do token
            'id_usuario' => $user['id_usuario'],
            // Guarda o username dentro do token
            'username' => $user['username'],
            // Guarda o nome dentro do token
            'nome' => $user['nome'],
            // Data de validade: agora + 8 horas (em segundos)
            'exp' => time() + (8 * 3600)
        ]);
        // Devolve o token e os dados que o frontend vai mostrar na tela
        echo json_encode(["token" => $token, "usuario" => [
            "id_usuario" => $user['id_usuario'],
            "nome" => $user['nome'],
            "username" => $user['username'],
            "foto" => $user['foto'],
            // Envia o tipo do perfil (usuario ou criador) para o frontend saber o que mostrar
            "tipo_perfil" => $user['tipo_perfil']
        ]]);
    } else {
        // 401 = não autorizado (e-mail ou senha errados)
        http_response_code(401);
        echo json_encode(["erro" => "E-mail ou senha inválidos."]);
    }
    // Encerra aqui para não cair nas outras rotas
    exit;
}

// ===== ROTA: POST /cadastro =====
if ($uri === '/cadastro' && $method === 'POST') {
    // Campos de texto vêm em $_POST (formulário com arquivo usa FormData)
    $nome = trim($_POST['nome'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $senha = $_POST['senha'] ?? '';

    // Se algum campo obrigatório estiver vazio, para aqui
    if (empty($nome) || empty($username) || empty($email) || empty($senha)) {
        // 400 = requisição inválida
        http_response_code(400);
        echo json_encode(["erro" => "Todos os campos obrigatórios devem ser preenchidos."]);
        exit;
    }

    // Verifica se já existe alguém com esse username ou e-mail
    $stmt = $db->prepare("SELECT id_usuario FROM usuario WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    // Se encontrou alguém, não deixa cadastrar de novo
    if ($stmt->fetch()) {
        // 409 = conflito (dado já existe)
        http_response_code(409);
        echo json_encode(["erro" => "Nome de usuário ou e-mail já cadastrados."]);
        exit;
    }

    // Foto padrão caso o usuário não envie nenhuma
    $fotoPath = "default_avatar.png";
    // Se enviou uma foto e o upload deu certo
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        // Pega a extensão do arquivo (jpg, png...) em minúsculo
        $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
        // Cria um nome único para a foto não sobrescrever outra
        $fotoName = uniqid() . "." . $ext;
        // Move a foto da pasta temporária para a pasta uploads
        move_uploaded_file($_FILES['foto']['tmp_name'], __DIR__ . "/uploads/" . $fotoName);
        // Guarda o nome para salvar no banco
        $fotoPath = $fotoName;
    }

    // Insere o novo usuário no banco
    $stmt = $db->prepare("INSERT INTO usuario (nome, username, email, senha, foto) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$nome, $username, $email, $senha, $fotoPath]);

    // 201 = criado com sucesso
    http_response_code(201);
    echo json_encode(["mensagem" => "Usuário cadastrado com sucesso!"]);
    exit;
}

// ===== ROTA: GET /publicacoes (lista o feed) =====
if ($uri === '/publicacoes' && $method === 'GET') {
    // Descobre quem está logado (pode ser ninguém)
    $user = getAuthenticatedUser();
    // Se tem usuário, pega o id; se não, usa 0
    $currentUserId = $user ? $user['id_usuario'] : 0;

    // Consulta: publicações + dados do autor + total de curtidas + se EU curti
    $query = "
        SELECT p.*, u.nome, u.username, u.foto AS foto_usuario,
            COUNT(c.id_curtida) AS total_curtidas,
            MAX(CASE WHEN c.id_usuario = :current_user THEN 1 ELSE 0 END) AS curtido_pelo_usuario
        FROM publicacao p
        JOIN usuario u ON p.id_usuario = u.id_usuario
        LEFT JOIN curtida c ON p.id_publicacao = c.id_publicacao
        GROUP BY p.id_publicacao
        ORDER BY p.datahora_publicacao DESC
    ";

    // Prepara a consulta
    $stmt = $db->prepare($query);
    // Coloca o id do usuário logado no lugar do :current_user
    $stmt->bindValue(':current_user', $currentUserId, PDO::PARAM_INT);
    // Executa a consulta
    $stmt->execute();

    // Devolve todas as publicações em JSON
    echo json_encode($stmt->fetchAll());
    exit;
}

// ===== ROTA: GET /usuarios/{username} (ver perfil) =====
// O ([^\/]+) captura o username que vem na URL e guarda em $matches[1]
if (preg_match('/^\/usuarios\/([^\/]+)$/', $uri, $matches) && $method === 'GET') {
    // Pega o username da URL e desfaz a codificação (ex.: %C3%A9 volta a ser é)
    $username = urldecode($matches[1]);

    // Busca os dados do usuário e conta as publicações e as curtidas recebidas
    $stmt = $db->prepare("
        SELECT u.id_usuario, u.nome, u.username, u.foto,
            (SELECT COUNT(*) FROM publicacao WHERE id_usuario = u.id_usuario) AS total_publicacoes,
            (SELECT COUNT(*) FROM curtida c
                JOIN publicacao p ON c.id_publicacao = p.id_publicacao
                WHERE p.id_usuario = u.id_usuario) AS total_curtidas_recebidas
        FROM usuario u
        WHERE u.username = ?
    ");
    $stmt->execute([$username]);
    // Guarda os dados do perfil (ou false se não achou)
    $perfil = $stmt->fetch();

    // Se não achou o usuário, devolve erro 404 (não encontrado)
    if (!$perfil) {
        http_response_code(404);
        echo json_encode(["erro" => "Usuário não encontrado."]);
        exit;
    }

    // Busca as publicações desse usuário, da mais nova para a mais antiga
    $stmt = $db->prepare("
        SELECT p.id_publicacao, p.texto, p.imagem, p.datahora_publicacao,
            COUNT(c.id_curtida) AS total_curtidas
        FROM publicacao p
        LEFT JOIN curtida c ON p.id_publicacao = c.id_publicacao
        WHERE p.id_usuario = ?
        GROUP BY p.id_publicacao
        ORDER BY p.datahora_publicacao DESC
    ");
    $stmt->execute([$perfil['id_usuario']]);

    // Coloca a lista de publicações dentro do perfil e devolve tudo em JSON
    $perfil['publicacoes'] = $stmt->fetchAll();
    echo json_encode($perfil);
    exit;
}

// ===== ROTA: POST /publicacoes (criar publicação) =====
if ($uri === '/publicacoes' && $method === 'POST') {
    // Descobre quem está logado
    $user = getAuthenticatedUser();
    // Sem login, não pode publicar
    if (!$user) {
        http_response_code(401);
        echo json_encode(["erro" => "Acesso não autorizado."]);
        exit;
    }

    // Busca no banco o tipo de perfil de quem está tentando publicar
    $stmt = $db->prepare("SELECT tipo_perfil FROM usuario WHERE id_usuario = ?");
    $stmt->execute([$user['id_usuario']]);
    $perfil = $stmt->fetch();

    // Só quem é "criador" pode publicar; "usuario" apenas interage (403 = proibido)
    if (!$perfil || $perfil['tipo_perfil'] !== 'criador') {
        http_response_code(403);
        echo json_encode(["erro" => "Seu perfil não tem permissão para publicar."]);
        exit;
    }

    // Pega o texto da publicação
    $texto = trim($_POST['texto'] ?? '');
    // Começa sem imagem
    $imagemPath = null;

    // Se enviou uma imagem e o upload deu certo
    if (isset($_FILES['imagem']) && $_FILES['imagem']['error'] === UPLOAD_ERR_OK) {
        // Pega a extensão do arquivo
        $ext = strtolower(pathinfo($_FILES['imagem']['name'], PATHINFO_EXTENSION));
        // Cria um nome único
        $imagemName = uniqid() . "." . $ext;
        // Move a imagem para a pasta uploads
        move_uploaded_file($_FILES['imagem']['tmp_name'], __DIR__ . "/uploads/" . $imagemName);
        // Guarda o nome para salvar no banco
        $imagemPath = $imagemName;
    }

    // Salva a publicação no banco
    $stmt = $db->prepare("INSERT INTO publicacao (id_usuario, texto, imagem) VALUES (?, ?, ?)");
    $stmt->execute([$user['id_usuario'], $texto, $imagemPath]);

    // 201 = criado com sucesso
    http_response_code(201);
    echo json_encode(["mensagem" => "Publicação criada com sucesso!"]);
    exit;
}

// ===== ROTA: POST /curtir (curtir ou descurtir) =====
if ($uri === '/curtir' && $method === 'POST') {
    // Precisa estar logado
    $user = getAuthenticatedUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(["erro" => "Acesso não autorizado."]);
        exit;
    }

    // Lê o JSON enviado e pega o id da publicação
    $data = json_decode(file_get_contents("php://input"), true);
    $id_publicacao = $data['id_publicacao'] ?? null;

    // Verifica se esse usuário já curtiu essa publicação
    $stmt = $db->prepare("SELECT id_curtida FROM curtida WHERE id_publicacao = ? AND id_usuario = ?");
    $stmt->execute([$id_publicacao, $user['id_usuario']]);
    $curtida = $stmt->fetch();

    // Se já curtiu, remove a curtida
    if ($curtida) {
        $delete = $db->prepare("DELETE FROM curtida WHERE id_curtida = ?");
        $delete->execute([$curtida['id_curtida']]);
        echo json_encode(["status" => "removido"]);
    } else {
        // Se ainda não curtiu, adiciona a curtida
        $insert = $db->prepare("INSERT INTO curtida (id_publicacao, id_usuario) VALUES (?, ?)");
        $insert->execute([$id_publicacao, $user['id_usuario']]);
        echo json_encode(["status" => "adicionado"]);
    }
    exit;
}

// ===== ROTA: DELETE /publicacoes/{id} (excluir publicação) =====
// O (\d+) captura o número do id e guarda em $matches[1]
if (preg_match('/^\/publicacoes\/(\d+)$/', $uri, $matches) && $method === 'DELETE') {
    // Precisa estar logado
    $user = getAuthenticatedUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(["erro" => "Acesso não autorizado."]);
        exit;
    }

    // Id da publicação que veio na URL
    $id_publicacao = $matches[1];
    // Só apaga se a publicação for do usuário logado (AND id_usuario = ?)
    $stmt = $db->prepare("DELETE FROM publicacao WHERE id_publicacao = ? AND id_usuario = ?");
    $stmt->execute([$id_publicacao, $user['id_usuario']]);

    // rowCount = quantas linhas foram apagadas
    if ($stmt->rowCount() > 0) {
        echo json_encode(["mensagem" => "Publicação excluída com sucesso."]);
    } else {
        // Nada apagado: não é dono da publicação ou ela não existe
        http_response_code(403);
        echo json_encode(["erro" => "Ação não permitida ou publicação inexistente."]);
    }
    exit;
}

// ===== NENHUMA ROTA ENCONTRADA =====
// Se chegou até aqui, nenhuma rota acima combinou com a URL
http_response_code(404);
echo json_encode(["erro" => "Rota não encontrada."]);
