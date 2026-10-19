function escapeHTML(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}
export function corporateInvitationEmail(
  company: string,
  leader: string,
  url: string,
  authorization: boolean,
) {
  const action = authorization
    ? 'Autorizar criação de conta'
    : 'Aceitar convite';
  const explanation = authorization
    ? 'Autorize apenas se concordar que o líder crie a sua nova conta, defina e possa redefinir a palavra-passe. Pode alterar a palavra-passe e sair da organização.'
    : 'Ao aceitar, abre a criação do seu acesso Framy Connect. Define o seu nome e palavra-passe. Se já tem conta, entre com o email convidado para confirmar a associação; a sua palavra-passe mantém-se.';
  return {
    subject:
      (authorization
        ? 'Autorização para criar conta — '
        : 'Convite para a equipa ') +
      company +
      ' — Framy Connect',
    text: `${leader}, da empresa ${company}, convida-o para a equipa.\n${explanation}\n${action}: ${url}\nValidade: 7 dias. Os líderes recebem apenas os resultados e contactos das campanhas da organização. O histórico pessoal não é partilhado. Nunca partilhe este link.`,
    html: `<h2>${escapeHTML(company)}</h2><p>${escapeHTML(leader)}, da empresa ${escapeHTML(company)}, convida-o para a equipa.</p><p>${explanation}</p><p><a style="display:inline-block;padding:14px 22px;background:#b83b00;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold" href="${escapeHTML(url)}">${action}</a></p><p>Validade: 7 dias. Os líderes recebem apenas os resultados e contactos das campanhas da organização. O histórico pessoal não é partilhado. Nunca partilhe este link.</p>`,
  };
}
