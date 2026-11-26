/* EN: Until trusted backend authentication and authorization exist, keep private packages disabled in production.
   PT: Até existir autenticação e autorização confiáveis no backend, mantém contratações bloqueadas em produção. */
export function privateLessonPackagesAccessGate(req, res, next) {
  if (process.env.NODE_ENV === "production") return res.status(403).send({
    success: false, statusCode: 403,
    body: "Contratações de aulas particulares indisponíveis em produção sem autenticação e autorização."
  });
  return next();
}
