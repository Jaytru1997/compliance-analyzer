import { Router } from 'express';
import multer from 'multer';
import { documentService } from '../services/document.service';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const category = req.body.category as 'Standard' | 'Procedure' || 'Procedure';

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docMetadata = await documentService.ingestDocument(file, category);
    res.json(docMetadata);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    res.json(await documentService.getDocuments());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await documentService.getDocumentById(req.params.id);
    if (doc) {
      res.json(doc);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await documentService.deleteDocument(req.params.id);
    if (success) {
      res.json({ message: 'Document deleted successfully' });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
