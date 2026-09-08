export const PLANS = {
  free: {
    features: {
      resumeAnalysis: 2,
      resumeImprovement: 2,
      mockInterview: false,
    },
  },

  premium: {
    features: {
      resumeAnalysis: 7,
      resumeImprovement: 7,
      mockInterview: 5,
    },
  },

  pro: {
    features: {
      resumeAnalysis: Infinity,
      mockInterview: Infinity,
      resumeImprovement: Infinity,
    },
  },
};
