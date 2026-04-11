import { openai, getEmbedding } from "../lib/embeddings.js";
import { searchVectors } from "../lib/qdrant.js";
// POST /api/projects/:projectId/ai/rubric
export const generateRubric = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { question } = req.body;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (!question || typeof question !== "string" || question.trim() === "") {
            res.status(400).json({ message: "question is required" });
            return;
        }
        // Embed the question and search for relevant knowledge base chunks
        const queryEmbedding = await getEmbedding(question);
        const searchResults = await searchVectors(queryEmbedding, projectId, 6);
        const knowledgeBaseContext = searchResults.length > 0
            ? searchResults
                .map((r, i) => `[Document ${i + 1}: ${r.payload.filename}]\n${r.payload.chunk}`)
                .join("\n\n---\n\n")
            : null;
        const systemPrompt = `You are an expert instructional designer who creates precise, fair grading rubrics for long-answer questions.

Generate a rubric with 3 to 6 criteria that thoroughly assess the quality of a student's response.

Rules:
- Each criterion must be a clear yes/no check (either the student demonstrates this or they don't).
- All criterion weights must be integers and must sum to exactly 100.
- Weights should reflect the relative importance of each criterion.
- Titles should be concise (3–6 words).
- Descriptions should clearly explain what "meeting" the criterion looks like.

${knowledgeBaseContext ? `Use the following project knowledge base as context to make the rubric domain-specific:\n\n${knowledgeBaseContext}\n\n` : ""}

Respond ONLY with a valid JSON object in this exact shape:
{
  "rubric": [
    {
      "title": "string",
      "description": "string",
      "weight": number
    }
  ]
}`;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Generate a grading rubric for the following question:\n\n${question}`,
                },
            ],
        });
        const raw = completion.choices[0]?.message?.content;
        if (!raw) {
            res.status(500).json({ message: "No response from AI" });
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            res.status(500).json({ message: "AI returned invalid JSON" });
            return;
        }
        if (!Array.isArray(parsed.rubric) || parsed.rubric.length === 0) {
            res.status(500).json({ message: "AI returned an invalid rubric structure" });
            return;
        }
        // Attach stable IDs for the frontend
        const rubric = parsed.rubric.map((criterion) => ({
            id: crypto.randomUUID(),
            title: criterion.title ?? "",
            description: criterion.description ?? "",
            weight: typeof criterion.weight === "number" ? criterion.weight : 0,
        }));
        res.status(200).json({ rubric });
    }
    catch (error) {
        console.error("Rubric generation error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=ai.controller.js.map