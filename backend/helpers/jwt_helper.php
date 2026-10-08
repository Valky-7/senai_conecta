<?php
// Classe que cria e confere o JWT (o "crachá digital" que prova que o usuário fez login)
// Um JWT tem 3 partes separadas por ponto: CABEÇALHO.DADOS.ASSINATURA
class JWTHelper {
    // Chave secreta usada para assinar o token (só o servidor conhece)
    private static string $secret = "SENAI_CONECTA_CHAVE_SECRETA_2026";

    // Cria um token a partir de um array de dados (o "payload")
    public static function encode(array $payload): string {
        // Cabeçalho: diz que é um JWT e que a assinatura usa HS256
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        // Converte o cabeçalho para base64 seguro para URL
        $base64UrlHeader = self::base64UrlEncode($header);
        // Converte os dados para base64 seguro para URL
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));

        // Cria a assinatura misturando cabeçalho + dados + chave secreta
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        // Converte a assinatura para base64 seguro para URL
        $base64UrlSignature = self::base64UrlEncode($signature);

        // Junta as 3 partes com ponto e devolve o token pronto
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    // Confere um token; devolve os dados se for válido ou null se for falso/vencido
    public static function decode(string $jwt): ?array {
        // Separa o token nas 3 partes
        $tokenParts = explode('.', $jwt);
        // Se não tem exatamente 3 partes, é inválido
        if (count($tokenParts) !== 3) return null;

        // Desfaz o base64 do cabeçalho
        $header = self::base64UrlDecode($tokenParts[0]);
        // Desfaz o base64 dos dados
        $payload = self::base64UrlDecode($tokenParts[1]);
        // Guarda a assinatura que veio no token
        $signatureProvided = $tokenParts[2];

        // Refaz o base64 do cabeçalho
        $base64UrlHeader = self::base64UrlEncode($header);
        // Refaz o base64 dos dados
        $base64UrlPayload = self::base64UrlEncode($payload);
        // Calcula de novo a assinatura que o token DEVERIA ter
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        // Converte a assinatura calculada para base64 seguro para URL
        $base64UrlSignature = self::base64UrlEncode($signature);

        // Se a assinatura calculada é diferente da recebida, o token foi alterado: recusa
        if ($base64UrlSignature !== $signatureProvided) return null;

        // Transforma o JSON dos dados de volta em array
        $payloadData = json_decode($payload, true);
        // Se tem data de validade (exp) e ela já passou, o token venceu: recusa
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) return null;

        // Token válido: devolve os dados (id, username, nome...)
        return $payloadData;
    }

    // Converte texto para base64 trocando + / = por caracteres seguros em URL
    private static function base64UrlEncode(string $text): string {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }

    // Faz o caminho contrário: volta os caracteres e desfaz o base64
    private static function base64UrlDecode(string $text): string {
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $text));
    }
}
