export const ok = (body) => ({
  success: true,
  statusCode: 200,
  body,
});

export const created = (body) => ({
  success: true,
  statusCode: 201,
  body,
});

export const badRequest = (message = "Bad request") => ({
  success: false,
  statusCode: 400,
  body: message,
});

export const notFound = (message = "Not found") => ({
  success: false,
  statusCode: 404,
  body: message,
});

export const serverError = (error) => ({
  success: false,
  statusCode: 500,
  body: error?.message || "Internal server error",
});