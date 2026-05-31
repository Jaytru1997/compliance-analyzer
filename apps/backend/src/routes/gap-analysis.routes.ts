import { Router } from 'express';
import { gapAnalysisService } from '../services/gap-analysis.service';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { standardDocId, procedureDocId } = req.body;

    if (!standardDocId || !procedureDocId) {
      return res.status(400).json({ error: 'Both standardDocId and procedureDocId are required' });
    }

    const findings = await gapAnalysisService.analyze(standardDocId, procedureDocId);

    res.json({ findings });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
