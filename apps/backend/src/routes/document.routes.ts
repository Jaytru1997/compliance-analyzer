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

router.get('/', (req, res) => {
  res.json(documentService.getDocuments());
});

router.get('/:id', (req, res) => {
  const doc = documentService.getDocumentById(req.params.id);
  if (doc) {
    res.json(doc);
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

export default router;
