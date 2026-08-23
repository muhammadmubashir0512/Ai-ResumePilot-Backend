// create errorhandler for handling server errors and give an error

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("ERROR CAUGHT:", err);

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
  });
};

export { errorHandler };
