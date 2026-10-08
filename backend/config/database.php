<?php
// Classe que cuida da conexão com o banco de dados (MariaDB/MySQL)
class Database {
    // Endereço do servidor do banco (no XAMPP é a própria máquina)
    private string $host = "localhost";
    // Nome do banco que criamos no arquivo .sql
    private string $db_name = "senai_conecta";
    // Usuário padrão do XAMPP
    private string $username = "root";
    // A senha padrão do XAMPP é vazia
    private string $password = "";
    // Guarda a conexão depois de criada (começa como null)
    public ?PDO $conn = null;

    // Função que devolve a conexão pronta para usar
    public function getConnection(): PDO {
        // Só cria a conexão se ainda não existir
        if ($this->conn === null) {
            try {
                // Cria a conexão usando PDO
                $this->conn = new PDO(
                    // Endereço do banco: tipo, servidor, nome do banco e codificação dos textos
                    "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                    // Usuário do banco
                    $this->username,
                    // Senha do banco
                    $this->password,
                    // Configurações extras
                    [
                        // Se o SQL tiver erro, o PHP lança uma exceção
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        // Os resultados vêm como array com o nome das colunas
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]
                );
            } catch (PDOException $e) {
                // Se não conseguiu conectar, responde com erro 500 (erro do servidor)
                http_response_code(500);
                echo json_encode(["erro" => "Falha na conexão com o banco de dados."]);
                // Para tudo, pois sem banco a API não funciona
                exit;
            }
        }
        // Devolve a conexão
        return $this->conn;
    }
}
