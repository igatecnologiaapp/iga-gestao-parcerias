# Corrigir acesso e recuperação de senha

## Objetivo
Permitir que a conta escolhida recupere o acesso com segurança, sem revelar senhas e sem enfraquecer as regras de autorização.

## Alterações
- Adicionar “Esqueci minha senha” à tela de acesso, enviando o link de recuperação para o e-mail informado.
- Criar uma tela pública para definir uma nova senha após abrir o link recebido.
- Exibir mensagens específicas para e-mail não confirmado e falhas de recuperação, em vez da mensagem genérica de credenciais inválidas.
- Validar no Preview o carregamento da tela de acesso e do fluxo de recuperação.

## Situação da conta
- Conta escolhida: `igatecnologia.app@gmail.com`.
- O e-mail ainda não está confirmado.
- A conta ainda não possui vínculo com empresa nem papel de acesso; após autenticar, continuará sem acesso aos dados internos até um administrador conceder essas autorizações.
- A senha atual é protegida e não pode ser consultada. O procedimento correto é criar uma nova senha pelo link enviado.

## Limites
- Nenhuma regra de segurança, vínculo empresarial ou papel será concedido automaticamente.
- Nenhuma funcionalidade da Fase 4 será iniciada.
