// take function as an parameter and then do promise and gave an output as a promise in resolve or catch and if error then  throw next error

const asyncHandler = (functionData) => (req, res, next) => {
  Promise.resolve(functionData(req, res, next)).catch((error) => {
    next(error);
  });
};

export default asyncHandler;
