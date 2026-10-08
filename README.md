# SENAI Conecta

Rede social web feita como simulado da prova final do curso técnico de Informática para Internet (SENAI). Usuários podem se cadastrar, entrar, publicar texto e imagem, curtir, pesquisar usuários e ver perfis.

## Situação do projeto

| Etapa | Descrição | Situação |
|---|---|---|
| 1 | Banco de dados e conexão com o MariaDB | Feita |
| 2 | Página inicial e estrutura básica | Feita |
| 3 | Cadastro de usuários | Feita |
| 4 | Login, sessão e logout | Feita |
| 5 | Criação de publicações com texto e imagem | A fazer |
| 6 | Feed e consulta das publicações | A fazer |
| 7 | Curtidas e retirada de curtidas | A fazer |
| 8 | Perfil do usuário | A fazer |
| 9 | Pesquisa e exclusão de publicações | A fazer |
| 10 | CSS, JavaScript, modais, mensagens e ajustes finais | A fazer |

## Tecnologias

- HTML5, CSS3 e JavaScript (sem frameworks nem bibliotecas externas)
- PHP no back-end (PDO para acessar o banco)
- MariaDB
- XAMPP (Apache + MariaDB)
- Visual Studio Code e DBeaver

## Estrutura de pastas

```
senai_conecta/
├── backend/
│   ├── config/
│   │   └── database.php        (previsto, ainda não usado)
│   ├── helpers/
│   │   └── jwt_helper.php      (previsto, não usado: o projeto usa sessões)
│   ├── uploads/                (fotos de perfil e imagens das publicações)
│   │   └── avatar.png          (foto padrão, obrigatória)
│   ├── index.php               (roteador + página de cadastro)
│   └── .htaccess
└── frontend/
    ├── css/
    │   └── style.css           (estilo de todas as páginas)
    ├── js/
    │   ├── api.js              (função que chama o backend + mensagens rápidas)
    │   ├── auth.js             (login, logout, sessão, modal de login)
    │   └── app.js              (feed e interações, será usado nas próximas etapas)
    └── index.html              (página inicial)
```

## Como rodar

1. Copie a pasta `senai_conecta` para `C:\xampp\htdocs\`.
2. Abra o XAMPP e ligue o **Apache** e o **MySQL/MariaDB**.
3. No DBeaver, rode o arquivo SQL do banco `senai_conecta` (tabelas `usuario`, `publicacao` e `curtida`).
4. Confirme que existe a pasta `backend/uploads/` com um arquivo `avatar.png` dentro.
5. Acesse pelo navegador (nunca abrindo o arquivo direto):
   - Página inicial: `http://localhost/senai_conecta/frontend/index.html`
   - Cadastro: `http://localhost/senai_conecta/backend/index.php`

Dados de conexão usados no PHP (padrão do XAMPP): host `localhost`, banco `senai_conecta`, usuário `root`, senha vazia.

## Banco de dados

Banco: `senai_conecta`, com `utf8mb4` e engine InnoDB.

```
USUARIO 1 ----- N PUBLICACAO
USUARIO 1 ----- N CURTIDA ----- N 1 PUBLICACAO
```

| Tabela | Colunas principais |
|---|---|
| `usuario` | id_usuario, nome, username (único), email (único), senha, foto, tipo_perfil, criado_em, atualizado_em |
| `publicacao` | id_publicacao, id_usuario, texto, imagem, datahora_publicacao |
| `curtida` | id_curtidas, id_publicacao, id_usuario, datahora_curtida |

Pontos importantes:

- `foto` tem `default 'avatar.png'`: quem não envia foto fica com a padrão.
- `tipo_perfil` é um ENUM com `'usuario'` e `'criador'`, e o padrão é `'usuario'`.
- As chaves estrangeiras usam `ON DELETE CASCADE`: apagar um usuário apaga as publicações e curtidas dele, e apagar uma publicação apaga as curtidas dela.
- No banco fica só o **nome do arquivo** da imagem (ex: `65f1a2b3c4d5e.png`). O caminho completo é montado como `backend/uploads/` + nome.
- Para `atualizado_em` mudar sozinho quando o registro for alterado:
  ```sql
  alter table usuario modify atualizado_em datetime default current_timestamp on update current_timestamp;
  ```

## Como o sistema funciona

### Arquitetura

O front-end (HTML, CSS e JavaScript) conversa com o back-end (PHP) por requisições `fetch()`. O professor pediu que **todas as rotas fiquem no `backend/index.php`**, então esse arquivo funciona como um roteador: lê o parâmetro `?rota=...` da URL e executa a função correspondente. As rotas respondem em **JSON**.

Formato padrão da resposta:

```json
{
  "sucesso": true,
  "mensagem": "Texto para mostrar ao usuário",
  "dados": {}
}
```

### Ordem do arquivo `backend/index.php`

A ordem importa. O PHP que responde JSON precisa vir **antes** do HTML, senão acontece o erro "headers already sent" e o JSON sai misturado com a página.

1. `session_start()`, variáveis iniciais e as funções (`responder`, `conectar`, `login`, `sessao`, `logout`).
2. Router: se a URL tem `?rota=...`, executa a função e termina com `exit`.
3. Sem rota: executa o PHP do cadastro (só quando o formulário é enviado por POST).
4. HTML da página de cadastro.

### Rotas existentes

| Rota | Método | O que faz |
|---|---|---|
| `index.php` (sem rota) | GET / POST | Mostra o formulário de cadastro e salva o usuário |
| `index.php?rota=login` | POST | Valida e-mail e senha e cria a sessão |
| `index.php?rota=sessao` | GET | Informa se há alguém logado e quem é |
| `index.php?rota=logout` | GET | Encerra a sessão |

Rotas previstas para as próximas etapas: criar publicação, listar feed, curtir/descurtir, perfil, pesquisar usuários e excluir publicação.

### Cadastro

1. O formulário envia `nome`, `username`, `email`, `senha`, `foto` e `tipo_perfil` por POST com `enctype="multipart/form-data"` (obrigatório por causa da foto).
2. O PHP valida: campos vazios, formato do e-mail, senha com no mínimo 6 caracteres e tipo de perfil dentro do ENUM.
3. Consulta o banco para ver se já existe o mesmo username ou e-mail.
4. Se enviou foto, confere a extensão (jpg, jpeg, png, gif, webp), gera um nome único com `uniqid()` e move o arquivo para `uploads/`. Se não enviou, usa `avatar.png`.
5. Criptografa a senha com `password_hash()` e faz o `INSERT` com prepared statement.

Regra para lembrar: texto, senha e select chegam em `$_POST`; arquivos chegam em `$_FILES`.

### Login e sessão

1. O usuário clica em **Entrar** e abre o modal de login, sem sair da página.
2. O `auth.js` envia e-mail e senha para `?rota=login`.
3. O PHP busca o usuário pelo e-mail e confere a senha com `password_verify()`.
4. Se estiver certo, chama `session_regenerate_id(true)` e guarda os dados em `$_SESSION` (id, nome, username, foto, tipo_perfil).
5. Se e-mail ou senha estiverem errados, a mensagem é a mesma ("Usuário ou senha inválidos."), para ninguém descobrir quais e-mails existem.
6. Ao abrir qualquer página, o `auth.js` chama `?rota=sessao`: se houver sessão, o cabeçalho mostra foto, `@username` e **Sair**; se não houver, mostra **Cadastrar** e **Entrar**.
7. **Sair** chama `?rota=logout`, que esvazia `$_SESSION` e chama `session_destroy()`.

A sessão funciona assim: o navegador guarda só um cookie com o ID da sessão, e os dados ficam no servidor.

### Front-end

| Arquivo | Função |
|---|---|
| `index.html` | Cabeçalho (nome, pesquisa, área do usuário), feed, modal de login e rodapé |
| `js/api.js` | `chamarApi(rota, formData)` faz o `fetch` ao backend; `mostrarMensagem(texto, tipo)` mostra aviso no canto da tela |
| `js/auth.js` | Modal de login, `verificarSessao()`, `fazerLogin()`, `fazerLogout()` e `atualizarAreaUsuario()` |
| `css/style.css` | Layout, cards, formulário, modal, alertas, mensagens rápidas e responsividade |

O `api.js` precisa ser carregado antes do `auth.js` no `index.html`, porque o `auth.js` usa as funções dele.

## Segurança aplicada

- **Senha:** `password_hash()` ao cadastrar e `password_verify()` ao entrar. Nunca é salva em texto puro.
- **SQL Injection:** todas as consultas usam prepared statements (`:parametro`).
- **XSS:** o que vem do usuário é exibido com `htmlspecialchars()`.
- **Upload:** só extensões de imagem permitidas e nome de arquivo gerado pelo servidor.
- **Sessão:** `session_regenerate_id(true)` no login.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "headers already sent" ou JSON misturado com HTML | O PHP das rotas está depois do HTML no `index.php` |
| Foto não aparece | Falta `avatar.png` em `backend/uploads/` ou o caminho `../backend/uploads/` está errado |
| Foto não é enviada | Falta `enctype="multipart/form-data"` no formulário |
| Erro de conexão com o banco | MariaDB desligado no XAMPP ou nome do banco diferente |
| Login não mantém a sessão | Página aberta direto do arquivo, e não por `http://localhost/...` |
| Cadastro dá erro de tipo de perfil | Valor do select diferente do ENUM (`usuario` / `criador`) |

## Para explicar na prova

O enunciado pede que o aluno saiba explicar:

- a estrutura do banco e os relacionamentos (1 usuário para N publicações, 1 usuário para N curtidas, 1 publicação para N curtidas);
- como funcionam cadastro, login, sessão, publicações e curtidas;
- por que as chaves estrangeiras existem e o que o `ON DELETE CASCADE` faz;
- a diferença entre `$_POST` e `$_FILES`;
- por que a senha é criptografada e por que os prepared statements são usados.

## Entrega

- Código-fonte completo do sistema
- Arquivo SQL do banco de dados
- Imagens utilizadas no sistema
- Projeto organizado no Visual Studio Code
- Sistema funcionando em ambiente local
