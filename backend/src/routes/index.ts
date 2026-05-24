import { Router } from 'express';
import authRoutes from './auth.routes';
import teamsRoutes from './teams.routes';
import matchesRoutes from './matches.routes';
import stadiumsRoutes from './stadiums.routes';
import simulationRoutes from './simulation.routes';
import leaderboardRoutes from './leaderboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/teams', teamsRoutes);
router.use('/matches', matchesRoutes);
router.use('/stadiums', stadiumsRoutes);
router.use('/simulation', simulationRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;
