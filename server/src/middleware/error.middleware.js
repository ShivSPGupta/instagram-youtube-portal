function errorMiddleware(error, req, res, next) {
  console.error("Unhandled API error:", error.message);
  res
    .status(500)
    .json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred.",
      },
    });
}

module.exports = errorMiddleware;
