import { Router } from 'express';
import authRoutes from './auth.routes';
import leaderboardRoutes from './leaderboard.routes';
import matchesRoutes from './matches.routes';
import simulationRoutes from './simulation.routes';
import stadiumsRoutes from './stadiums.routes';
import teamsRoutes from './teams.routes';
import usersRoutes from './users.routes';
import { ok } from '../utils/apiResponse';

const router = Router();

// 헬스체크
router.get('/health', (_req, res) => res.json(ok({ status: 'ok' })));

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/teams', teamsRoutes);
router.use('/stadiums', stadiumsRoutes);
router.use('/matches', matchesRoutes);
router.use('/simulation', simulationRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;
