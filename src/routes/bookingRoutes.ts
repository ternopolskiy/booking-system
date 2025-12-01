import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';

const router = Router();
const bookingController = new BookingController();

router.post('/reserve', (req, res) => bookingController.reserve(req, res));

export default router;
