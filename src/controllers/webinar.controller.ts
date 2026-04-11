import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { createZoomMeeting } from "../lib/zoom.js";
import { sendHostInviteEmail, sendRegistrationConfirmEmail } from "../lib/email.js";

// GET /api/projects/:projectId/webinars
// Accessible by both trainers and trainees who are project members
export const getWebinars = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;
    const role = req.role!;

    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }

    // Verify membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        trainers: { select: { id: true } },
        trainees: { select: { id: true } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const isMember =
      role === "trainer"
        ? project.trainers.some((t) => t.id === userId)
        : project.trainees.some((t) => t.id === userId);

    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    const webinars = await prisma.webinar.findMany({
      where: { projectId },
      include: {
        hostTrainer: { select: { id: true, name: true, email: true } },
        _count: { select: { registrations: true } },
        // For trainees — include only their own registration so we can show status
        registrations:
          role === "trainee"
            ? { where: { traineeId: userId }, select: { id: true } }
            : false,
      },
      orderBy: { scheduledAt: "asc" },
    });

    res.status(200).json({ webinars });
  } catch (error) {
    console.error("getWebinars error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/projects/:projectId/webinars  (admin only)
export const createWebinar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { title, description, scheduledAt, duration, hostTrainerId } = req.body;

    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ message: "title is required" });
      return;
    }
    if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
      res.status(400).json({ message: "scheduledAt must be a valid ISO date string" });
      return;
    }
    if (!hostTrainerId || typeof hostTrainerId !== "string") {
      res.status(400).json({ message: "hostTrainerId is required" });
      return;
    }

    const durationMins: number =
      typeof duration === "number" && duration > 0 ? duration : 60;

    const scheduledDate = new Date(scheduledAt);

    // Verify the host trainer exists and is a member of the project
    const hostTrainer = await prisma.trainer.findFirst({
      where: {
        id: hostTrainerId,
        projects_trainer: { some: { id: projectId } },
      },
      select: { id: true, name: true, email: true },
    });

    if (!hostTrainer) {
      res.status(400).json({
        message: "Host trainer not found or is not a member of this project",
      });
      return;
    }

    // Create Zoom meeting
    const meeting = await createZoomMeeting({
      title: title.trim(),
      scheduledAt: scheduledDate,
      duration: durationMins,
    });

    // Persist webinar
    const webinar = await prisma.webinar.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        scheduledAt: scheduledDate,
        duration: durationMins,
        zoomMeetingId: meeting.id,
        zoomJoinUrl: meeting.join_url,
        zoomStartUrl: meeting.start_url,
        projectId,
        hostTrainerId,
      },
      include: {
        hostTrainer: { select: { id: true, name: true, email: true } },
        _count: { select: { registrations: true } },
      },
    });

    // Send host invite email (non-blocking — don't fail the request if email fails)
    sendHostInviteEmail({
      toEmail: hostTrainer.email,
      trainerName: hostTrainer.name ?? hostTrainer.email,
      webinarTitle: webinar.title,
      scheduledAt: scheduledDate,
      duration: durationMins,
      startUrl: meeting.start_url,
    }).catch((err) => console.error("Host invite email failed:", err));

    res.status(201).json({ message: "Webinar created successfully", webinar });
  } catch (error) {
    console.error("createWebinar error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId/webinars/:webinarId  (admin only)
export const deleteWebinar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, webinarId } = req.params;

    if (typeof projectId !== "string" || typeof webinarId !== "string") {
      res.status(400).json({ message: "Project ID and Webinar ID are required" });
      return;
    }

    const webinar = await prisma.webinar.findUnique({
      where: { id: webinarId, projectId },
    });

    if (!webinar) {
      res.status(404).json({ message: "Webinar not found" });
      return;
    }

    await prisma.webinar.delete({ where: { id: webinarId } });

    res.status(200).json({ message: "Webinar deleted successfully" });
  } catch (error) {
    console.error("deleteWebinar error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/projects/:projectId/webinars/:webinarId/register  (trainee only)
export const registerForWebinar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, webinarId } = req.params;
    const { email } = req.body;
    const traineeId = req.userId!;

    if (typeof projectId !== "string" || typeof webinarId !== "string") {
      res.status(400).json({ message: "Project ID and Webinar ID are required" });
      return;
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ message: "A valid email is required" });
      return;
    }

    // Verify trainee is a project member
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { trainees: { where: { id: traineeId }, select: { id: true } } },
    });

    if (!project || project.trainees.length === 0) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    const webinar = await prisma.webinar.findUnique({
      where: { id: webinarId, projectId },
      include: { hostTrainer: { select: { name: true } } },
    });

    if (!webinar) {
      res.status(404).json({ message: "Webinar not found" });
      return;
    }

    // Past webinars cannot be registered for
    if (webinar.scheduledAt < new Date()) {
      res.status(400).json({ message: "Cannot register for a past webinar" });
      return;
    }

    // Check for existing registration
    const existing = await prisma.webinarRegistration.findUnique({
      where: { webinarId_traineeId: { webinarId, traineeId } },
    });

    if (existing) {
      res.status(409).json({ message: "You are already registered for this webinar" });
      return;
    }

    const trainee = await prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { name: true },
    });

    const registration = await prisma.webinarRegistration.create({
      data: { webinarId, traineeId, email },
    });

    // Send confirmation email (non-blocking)
    sendRegistrationConfirmEmail({
      toEmail: email,
      traineeName: trainee?.name ?? null,
      webinarTitle: webinar.title,
      scheduledAt: webinar.scheduledAt,
      duration: webinar.duration,
      joinUrl: webinar.zoomJoinUrl,
      hostName: webinar.hostTrainer.name ?? "Your Trainer",
    }).catch((err) => console.error("Registration confirm email failed:", err));

    res.status(201).json({ message: "Registered successfully", registration });
  } catch (error) {
    console.error("registerForWebinar error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
