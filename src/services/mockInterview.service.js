import ApiError from "../utils/ApiError.js";
import { Resume } from "../models/Resume.model.js";
import { Interview } from "../models/Interview.model.js";
import { InterviewQueue } from "../Queues/interview.queue.js";
import { setValue } from "../utils/redis.js";
import { aiServices } from "./ai.service.js";

export const InterviewService = async ({ user, resumeId }) => {
  if (!user) {
    throw new ApiError(401, "Unauthorized Request");
  }

  const userResume = await Resume.findOne({
    _id: resumeId,
    owner: user,
  });

  if (!userResume) {
    throw new ApiError(400, "No Resume Analysis Found");
  }

  const New_Interview = await Interview.create({
    owner: user,
    jobTitle: userResume.jobTitle,
    jobDescription: userResume.jobDescription,
    resumeText: userResume.pdfText,
    language: "Roman Urdu ",
    interviewType: "behavioral",
    difficulty: "easy",
    status: "pending",
    currentQuestionIndex: 0,
    startedAt: new Date(),
  });

  const interviewData = {
    resumeText: New_Interview.resumeText,
    jobTitle: New_Interview.jobTitle,
    jobDescription: New_Interview.jobDescription,
    language: New_Interview.language,
    interviewType: New_Interview.interviewType,
    difficulty: New_Interview.difficulty,
  };

  await InterviewQueue.add(
    "mock-interview",
    {
      interviewId: New_Interview._id.toString(),
      interviewData,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

  await setValue(
    `job-status:${New_Interview._id}`,
    {
      stage: "queued",
      status: "waiting",
    },
    600,
  );

  return New_Interview;
};

export const answerCheck = async ({
  user,
  answer,
  currentQuestion,
  interviewId,
}) => {
  if (!user) {
    throw new ApiError(401, "Unauthorized Request");
  }

  const userInterview = await Interview.findOne({
    _id: interviewId,
    owner: user,
  });

  if (!userInterview) {
    throw new ApiError(400, "No Interview Found");
  }

  if (userInterview.status === "completed") {
    throw new ApiError(400, "This interview has already been completed");
  }

  if (!answer || !answer.trim()) {
    throw new ApiError(400, "Please give an answer");
  }

  const questionIndexCheck =
    Number(currentQuestion) === userInterview.currentQuestionIndex;

  if (!questionIndexCheck) {
    throw new ApiError(400, "Question index not match");
  }

  const question = userInterview.questions[currentQuestion];

  if (!question) {
    throw new ApiError(400, "Question not found");
  }

  const isLastQuestion = currentQuestion === userInterview.maxQuestions - 1;

  const interviewHistory = userInterview.questions.map((q, index) => ({
    questionNumber: index + 1,
    question: q.question,
    answer: index === currentQuestion ? answer : q.answer,
    score: q.score,
    feedback: q.feedback,
    type: q.type,
  }));

  const interviewData = {
    resumeText: userInterview.resumeText,
    jobTitle: userInterview.jobTitle,
    jobDescription: userInterview.jobDescription,
    language: userInterview.language,
    interviewType: userInterview.interviewType,
    difficulty: userInterview.difficulty,
    maxQuestions: userInterview.maxQuestions,
  };

  const prompt = `
Evaluate the candidate's answer to the exact current interview question.

Interview Context:
${JSON.stringify(interviewData, null, 2)}

Maximum Questions:
${userInterview.maxQuestions}

Current Question Index:
${currentQuestion}

Current Question Number:
${currentQuestion + 1}

Is Final Question:
${isLastQuestion}

Complete Interview History:
${JSON.stringify(interviewHistory, null, 2)}

Current Question:
${question.question}

Current Candidate Answer:
${answer}

Evaluate the current answer using the exact current question, candidate resume, job description, and complete interview history.

If this is NOT the final question:
- Evaluate the current answer.
- Generate exactly ONE next interview question.
- finalEvaluation must be null.

If this IS the final question:
- Evaluate the current answer.
- Do NOT generate another question.
- nextQuestion must be null.
- Generate the finalEvaluation using the complete interview history and the current answer.
`;

  const instruction = `
You are a professional AI interviewer and evaluator.

Your task is to conduct and evaluate a professional job interview.

You have access to:
- Candidate resume
- Target job title
- Target job description
- Interview type
- Interview difficulty
- Maximum number of questions
- Current question index and number
- Complete interview history
- Current candidate answer
- Whether the current question is the final question

Evaluate the candidate's answer ONLY against the exact current interview question.

The evaluation must consider:

- Whether the answer directly addresses the question
- Technical correctness
- Factual correctness
- Relevant knowledge
- Practical understanding
- Problem-solving ability
- Clarity
- Logical structure
- Relevance to the target job
- Candidate's actual resume and experience

Do not evaluate the answer against a different question.

Give the current answer a score from 0 to 100.

Provide concise and specific feedback explaining:
- What was good
- What was missing or incorrect
- What could be improved

Do not invent experience, projects, skills, technologies, or achievements that are not present in the provided resume or interview history.

INTERVIEW FLOW RULES:

If "Is Final Question" is false:

- Generate exactly ONE next interview question.
- The next question must be relevant to the target job and job description.
- Consider the candidate's resume.
- Consider previous questions and answers.
- Continue the interview naturally.
- Do not repeat previous questions.
- Respect the interview type.
- Respect the difficulty level.
- Ask only ONE question.
- Do not provide the answer.
- Do not provide hints.
- finalEvaluation must be null.

If "Is Final Question" is true:

- Do NOT generate another interview question.
- nextQuestion must be null.
- Generate a finalEvaluation based on the complete interview history and the current answer.

The finalEvaluation must contain:

- overallScore
- technicalKnowledge
- communication
- problemSolving
- relevance
- strengths
- weaknesses
- recommendations

All category scores must be between 0 and 100.

The strengths array must contain specific strengths demonstrated during the interview.

The weaknesses array must contain specific weaknesses demonstrated during the interview.

The recommendations array must contain practical recommendations for improving interview performance.

The finalEvaluation must consider the complete interview history, not only the final answer.

Do not invent information.

Return ONLY valid JSON.

For a non-final question return exactly:

{
  "score": 0,
  "feedback": "Brief and specific feedback.",
  "nextQuestion": "The next interview question.",
  "finalEvaluation": null
}

For the final question return exactly:

{
  "score": 0,
  "feedback": "Brief and specific feedback.",
  "nextQuestion": null,
  "finalEvaluation": {
    "overallScore": 0,
    "technicalKnowledge": 0,
    "communication": 0,
    "problemSolving": 0,
    "relevance": 0,
    "strengths": [],
    "weaknesses": [],
    "recommendations": []
  }
}
`;

  const result = await aiServices({
    prompt,
    instruction,
  });

  const parsedResult = JSON.parse(result);

  if (
    typeof parsedResult.score !== "number" ||
    parsedResult.score < 0 ||
    parsedResult.score > 100
  ) {
    throw new ApiError(500, "Invalid AI score");
  }

  if (!parsedResult.feedback) {
    throw new ApiError(500, "AI feedback missing");
  }

  userInterview.questions[currentQuestion].answer = answer;
  userInterview.questions[currentQuestion].score = parsedResult.score;
  userInterview.questions[currentQuestion].feedback = parsedResult.feedback;

  if (isLastQuestion) {
    const scores = userInterview.questions
      .map((q) => q.score)
      .filter(
        (score) => typeof score === "number" && score >= 0 && score <= 100,
      );

    const overallScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((total, score) => total + score, 0) / scores.length,
          )
        : 0;

    const finalEvaluation = {
      ...parsedResult.finalEvaluation,
      overallScore,
    };

    userInterview.finalEvaluation = finalEvaluation;
    userInterview.status = "completed";

    await userInterview.save();

    return {
      currentQuestion,
      interviewCompleted: true,
      parsedResult: {
        ...parsedResult,
        finalEvaluation,
      },
    };
  }

  if (!parsedResult.nextQuestion) {
    throw new ApiError(500, "Next interview question missing");
  }

  userInterview.questions.push({
    question: parsedResult.nextQuestion,
    answer: null,
    score: null,
    feedback: null,
    type: userInterview.interviewType,
  });

  userInterview.status = "in-progress";
  userInterview.currentQuestionIndex += 1;

  await userInterview.save();

  const nextQuestionIndex = userInterview.currentQuestionIndex;

  return {
    currentQuestion: nextQuestionIndex,
    interviewCompleted: false,
    parsedResult,
  };
};
