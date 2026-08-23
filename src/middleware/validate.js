import ApiError from "../utils/ApiError.js";

const validate = (schema, validateOn) => {
  return (req, res, next) => {
    const result = schema.safeParse(req[validateOn]);

    if (!result.success) {
      return next(
        new ApiError(
          400,
          result.error.issues[0]?.message || "Validation failed",
          result.error.issues,
        ),
      );
    }

    req[validateOn] = result.data;
    next();
  };
};

export default validate;
