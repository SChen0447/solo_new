import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJsonFile, writeJsonFile, type Artwork, type ArtworkData } from '../utils.js';

const router = Router();
const ARTWORKS_FILE = 'artworks.json';

router.get('/', (req: Request, res: Response): void => {
  try {
    const data = readJsonFile<ArtworkData>(ARTWORKS_FILE);
    res.json({ success: true, data: data.artworks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch artworks' });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = readJsonFile<ArtworkData>(ARTWORKS_FILE);
    const artwork = data.artworks.find((a: Artwork) => a.id === id);

    if (!artwork) {
      res.status(404).json({ success: false, error: 'Artwork not found' });
      return;
    }

    res.json({ success: true, data: artwork });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch artwork' });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, category, width, height, year, price, artistName, artistBio, thumbnailUrl } = req.body;

    if (!name || !category || !width || !height || !year || !artistName) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const data = readJsonFile<ArtworkData>(ARTWORKS_FILE);
    const newArtwork: Artwork = {
      id: uuidv4(),
      name,
      category,
      width: Number(width),
      height: Number(height),
      year: Number(year),
      price: Number(price) || 0,
      artistName,
      artistBio: artistBio || '',
      thumbnailUrl: thumbnailUrl || '',
    };

    data.artworks.push(newArtwork);
    writeJsonFile(ARTWORKS_FILE, data);

    res.status(201).json({ success: true, data: newArtwork });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create artwork' });
  }
});

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = readJsonFile<ArtworkData>(ARTWORKS_FILE);
    const index = data.artworks.findIndex((a: Artwork) => a.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'Artwork not found' });
      return;
    }

    data.artworks[index] = {
      ...data.artworks[index],
      ...req.body,
      id,
    };

    writeJsonFile(ARTWORKS_FILE, data);
    res.json({ success: true, data: data.artworks[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update artwork' });
  }
});

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = readJsonFile<ArtworkData>(ARTWORKS_FILE);
    const filtered = data.artworks.filter((a: Artwork) => a.id !== id);

    if (filtered.length === data.artworks.length) {
      res.status(404).json({ success: false, error: 'Artwork not found' });
      return;
    }

    data.artworks = filtered;
    writeJsonFile(ARTWORKS_FILE, data);
    res.json({ success: true, message: 'Artwork deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete artwork' });
  }
});

export default router;
