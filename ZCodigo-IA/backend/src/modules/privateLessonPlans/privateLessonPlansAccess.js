/* EN: Match the financial-account security policy until trusted server authentication exists.
   PT: Segue a política de segurança das contas financeiras até existir autenticação confiável no servidor. */
export function privateLessonPlansAccessGate(req, res, next) {
  if (process.env.NODE_ENV === "production") return res.status(403).send({
    success: false, statusCode: 403,
    body: "Modelos de aulas particulares indisponíveis em produção sem autenticação e autorização."
  });
  return next();
}
