import { prisma } from "../../../lib/prisma";

const refreshTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export const accessTokenLifetimeSeconds = 15 * 60;

export const authService = {
  authenticate(username: string, password: string) {
    return prisma.user
      .findFirst({ where: { username, enableState: 0, deletedAt: null } })
      .then(async (user) =>
        user && (await Bun.password.verify(password, user.passwordHash)) ? user : null
      );
  },

  async createSession(userId: number, refreshToken: string) {
    const expiresAt = new Date(Date.now() + refreshTokenLifetimeMs);
    return prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: await Bun.password.hash(refreshToken),
        expiresAt,
      },
    });
  },

  async rotateSession(sessionId: number, refreshToken: string, nextRefreshToken: string) {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session || !(await Bun.password.verify(refreshToken, session.refreshTokenHash)))
      return null;

    return prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: await Bun.password.hash(nextRefreshToken) },
    });
  },

  listSessions(userId: number) {
    return prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  },

  revokeSession(userId: number, sessionId: number) {
    return prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  activeSession(userId: number, sessionId: number) {
    return prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { isAdmin: true, enableState: 0, deletedAt: null },
      },
    });
  },

  currentUser(userId: number) {
    return prisma.user.findFirst({
      where: { id: userId, isAdmin: true, enableState: 0, deletedAt: null },
    });
  },
};
