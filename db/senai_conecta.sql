-- Cria o banco de dados se ele ainda não existir, com suporte a acentos e emojis
CREATE DATABASE IF NOT EXISTS senai_conecta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Seleciona o banco para usar nos comandos seguintes
USE senai_conecta;

-- TABELA DE USUÁRIOS
CREATE TABLE usuario (
    -- Número único de cada usuário, gerado automaticamente (chave primária)
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    -- Nome completo (obrigatório)
    nome VARCHAR(100) NOT NULL,
    -- Nome de usuário (@username), obrigatório e não pode repetir
    username VARCHAR(50) NOT NULL UNIQUE,
    -- E-mail usado no login, obrigatório e não pode repetir
    email VARCHAR(100) NOT NULL UNIQUE,
    -- Senha (obrigatória)
    senha VARCHAR(255) NOT NULL,
    -- Nome do arquivo da foto; se não informar, usa avatar.png
    foto VARCHAR(255) DEFAULT 'avatar.png',
    -- Tipo do perfil: "usuario" só interage, "criador" também publica
    tipo_perfil ENUM('usuario', 'criador') DEFAULT 'usuario',
    -- Data e hora em que o usuário foi criado
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
	-- Data e hora da última atualização
	atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
-- InnoDB é o motor de tabela que permite chaves estrangeiras
) ENGINE=InnoDB;

-- TABELA DE PUBLICAÇÕES
CREATE TABLE publicacao (
    -- Número único da publicação
    id_publicacao INT AUTO_INCREMENT PRIMARY KEY,
    -- Quem publicou (liga com a tabela usuario)
    id_usuario INT NOT NULL,
    -- Texto da publicação (obrigatório)
    texto TEXT NOT NULL,
    -- Nome do arquivo da imagem (pode ficar vazio)
    imagem VARCHAR(255) NULL,
    -- Data e hora da publicação, preenchida automaticamente
    datahora_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Chave estrangeira: se o usuário for apagado, as publicações dele também são
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE cascade
) ENGINE=InnoDB;

-- TABELA DE CURTIDAS
CREATE TABLE curtida (
    -- Número único da curtida
    id_curtida INT AUTO_INCREMENT PRIMARY KEY,
    -- Qual publicação foi curtida
    id_publicacao INT NOT NULL,
    -- Quem curtiu
    id_usuario INT NOT NULL,
    -- Data e hora da curtida, preenchida automaticamente
    datahora_curtida DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Impede que o mesmo usuário curta a mesma publicação duas vezes
    UNIQUE KEY unique_curtida (id_publicacao, id_usuario),
    -- Se a publicação for apagada, as curtidas dela também são
    FOREIGN KEY (id_publicacao) REFERENCES publicacao(id_publicacao) ON DELETE CASCADE,
    -- Se o usuário for apagado, as curtidas dele também são
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
