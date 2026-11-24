/* EN: Financial account names, balances and opening amounts are sensitive. Until the
       application has trusted server-side authentication and school authorization,
       deny access to these endpoints in production instead of trusting a client role.
   PT: Nomes das contas, saldos e valores iniciais são dados sensíveis. Até existir
       autenticação confiável e autorização por escola no servidor, bloqueia estas
       rotas em produção, sem confiar em papéis informados pelo cliente. */
export function financialAccountsAccessGate(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).send({
      success: false,
      statusCode: 403,
      body: "Contas financeiras indisponíveis em produção sem autenticação e autorização."
    });
  }
  return next();
}
