import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { getEmbedding } from "../lib/embeddings.js";
import { searchVectors } from "../lib/qdrant.js";
import { getSignedUrl } from "../lib/gcs.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/projects/:projectId/playground/chats
export const createChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const traineeId = req.userId!;
    const { title } = req.body;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    const chat = await prisma.chat.create({
      data: {
        title: title || "New Chat",
        projectId,
        traineeId,
      },
    });

    res.status(201).json({
      message: "Chat created",
      chat,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId/playground/chats
export const getChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const traineeId = req.userId!;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    const chats = await prisma.chat.findMany({
      where: { projectId, traineeId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json({ chats });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId/playground/chats/:chatId
export const getChatMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, chatId } = req.params;
    const traineeId = req.userId!;
    if (typeof projectId !== "string" || typeof chatId !== "string") {
      res.status(400).json({ message: "Project ID and Chat ID are required" });
      return;
    }
    const chat = await prisma.chat.findUnique({
      where: { id: chatId, projectId, traineeId },
      include: {
        messages: {
          include: {
            sources: {
              select: {
                id: true,
                resourceId: true,
                filename: true,
                url: true,
                chunkText: true,
                score: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    res.status(200).json({ chat });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId/playground/chats/:chatId
export const deleteChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, chatId } = req.params;
    const traineeId = req.userId!;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof chatId !== "string") {
      res.status(400).json({ message: "Chat ID is required" });
      return;
    }
    const chat = await prisma.chat.findUnique({
      where: { id: chatId, projectId, traineeId },
    });

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    await prisma.chat.delete({
      where: { id: chatId },
    });

    res.status(200).json({ message: "Chat deleted" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/projects/:projectId/playground/chats/:chatId/messages (SSE)
export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, chatId } = req.params;
  const traineeId = req.userId!;
  const { message } = req.body;
  if (typeof projectId !== "string") {
    res.status(400).json({ message: "Project ID is required" });
    return;
  }
  if (typeof chatId !== "string") {
    res.status(400).json({ message: "Chat ID is required" });
    return;
  }
  if (!message) {
    res.status(400).json({ message: "message is required" });
    return;
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId, projectId, traineeId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 20,
        select: {
          role: true,
          content: true,
        },
      },
    },
  });

  if (!chat) {
    res.status(404).json({ message: "Chat not found" });
    return;
  }

  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // Step 1: Save user message
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        role: "USER",
        content: message,
      },
    });

    res.write(
      `data: ${JSON.stringify({
        type: "user_message",
        messageId: userMessage.id,
      })}\n\n`,
    );

    // Step 2: Generate embedding
    res.write(
      `data: ${JSON.stringify({
        type: "status",
        message: "Searching resources...",
      })}\n\n`,
    );

    const queryEmbedding = await getEmbedding(message);

    // Step 3: Search Qdrant
    const searchResults = await searchVectors(queryEmbedding, projectId, 5);

    // Step 4: Deduplicate sources by resourceId (keep highest score)
    const sourceMap = new Map<
      string,
      {
        resourceId: string;
        filename: string;
        chunkText: string;
        score: number;
      }
    >();

    for (const result of searchResults) {
      const existing = sourceMap.get(result.payload.resourceId);

      if (!existing || result.score > existing.score) {
        sourceMap.set(result.payload.resourceId, {
          resourceId: result.payload.resourceId,
          filename: result.payload.filename,
          chunkText: result.payload.chunk,
          score: result.score,
        });
      }
    }

    // Step 5: Get signed URLs for deduplicated sources
    const sourcesData = await Promise.all(
      Array.from(sourceMap.values()).map(async (source) => {
        const resource = await prisma.resource.findUnique({
          where: { id: source.resourceId },
          select: { id: true, filename: true, refId: true },
        });

        let url = "";
        if (resource) {
          try {
            url = await getSignedUrl(resource.refId);
          } catch {
            url = "";
          }
        }

        return {
          resourceId: source.resourceId,
          filename: source.filename,
          url,
          chunkText: source.chunkText,
          score: source.score,
        };
      }),
    );

    // Step 6: Build context (still use ALL chunks for better RAG)
    const context = searchResults
      .map(
        (r, i) =>
          `[Source ${i + 1}: ${r.payload.filename}]\n${r.payload.chunk}`,
      )
      .join("\n\n---\n\n");

    // Step 7: Build conversation history
    const conversationHistory: {
      role: "user" | "assistant";
      content: string;
    }[] = chat.messages.map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

    // Step 8: Stream response
    res.write(
      `data: ${JSON.stringify({
        type: "status",
        message: "Generating response...",
      })}\n\n`,
    );

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are a helpful learning assistant for a training project. 
Answer questions based on the provided context from project resources. 
If the context doesn't contain enough information to answer, say so honestly.
Be concise but thorough. Use markdown formatting when helpful.

Context from project resources:
${context}`,
        },
        ...conversationHistory,
        {
          role: "user",
          content: message,
        },
      ],
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(
          `data: ${JSON.stringify({
            type: "chunk",
            content,
          })}\n\n`,
        );
      }
    }

    // Step 9: Save assistant message with deduplicated sources
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "ASSISTANT",
        content: fullResponse,
        sources: {
          create: sourcesData.map((s) => ({
            resourceId: s.resourceId,
            filename: s.filename,
            url: s.url,
            chunkText: s.chunkText,
            score: s.score,
          })),
        },
      },
      include: {
        sources: {
          select: {
            id: true,
            resourceId: true,
            filename: true,
            url: true,
            score: true,
          },
        },
      },
    });

    // Step 10: Auto title for first message
    if (chat.messages.length === 0) {
      const titleStream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Generate a short title (max 6 words) for this chat based on the user's message. Return only the title, nothing else.",
          },
          { role: "user", content: message },
        ],
      });

      const title = titleStream.choices[0]?.message?.content || "New Chat";

      await prisma.chat.update({
        where: { id: chatId },
        data: { title },
      });

      res.write(
        `data: ${JSON.stringify({
          type: "title",
          title,
        })}\n\n`,
      );
    }

    // Step 11: Send deduplicated sources
    res.write(
      `data: ${JSON.stringify({
        type: "sources",
        messageId: assistantMessage.id,
        sources: assistantMessage.sources,
      })}\n\n`,
    );

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        messageId: assistantMessage.id,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error("Playground error:", error);

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Failed to generate response",
      })}\n\n`,
    );

    res.end();
  }
};
