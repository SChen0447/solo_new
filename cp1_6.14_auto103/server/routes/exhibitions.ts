import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJsonFile, writeJsonFile, type Exhibition, type ExhibitionData, type ArtworkData, type ExhibitionArtwork } from '../utils.js';

const router = Router();
const EXHIBITIONS_FILE = 'exhibitions.json';
const ARTWORKS_FILE = 'artworks.json';

router.get('/', (req: Request, res: Response): void => {
  try {
    const data = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    res.json({ success: true, data: data.exhibitions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch exhibitions' });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    const exhibition = data.exhibitions.find((e: Exhibition) => e.id === id);

    if (!exhibition) {
      res.status(404).json({ success: false, error: 'Exhibition not found' });
      return;
    }

    res.json({ success: true, data: exhibition });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch exhibition' });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const { title, startDate, endDate, openTime, description, artworks } = req.body;

    if (!title || !startDate || !endDate || !openTime) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const data = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    const newExhibition: Exhibition = {
      id: uuidv4(),
      title,
      startDate,
      endDate,
      openTime,
      description: description || '',
      artworks: artworks || [],
    };

    data.exhibitions.push(newExhibition);
    writeJsonFile(EXHIBITIONS_FILE, data);

    res.status(201).json({ success: true, data: newExhibition });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create exhibition' });
  }
});

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    const index = data.exhibitions.findIndex((e: Exhibition) => e.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'Exhibition not found' });
      return;
    }

    data.exhibitions[index] = {
      ...data.exhibitions[index],
      ...req.body,
      id,
    };

    writeJsonFile(EXHIBITIONS_FILE, data);
    res.json({ success: true, data: data.exhibitions[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update exhibition' });
  }
});

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const data = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    const filtered = data.exhibitions.filter((e: Exhibition) => e.id !== id);

    if (filtered.length === data.exhibitions.length) {
      res.status(404).json({ success: false, error: 'Exhibition not found' });
      return;
    }

    data.exhibitions = filtered;
    writeJsonFile(EXHIBITIONS_FILE, data);
    res.json({ success: true, message: 'Exhibition deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete exhibition' });
  }
});

router.get('/:id/conflicts', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const exhibitionsData = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    const currentExhibition = exhibitionsData.exhibitions.find((e: Exhibition) => e.id === id);

    if (!currentExhibition) {
      res.status(404).json({ success: false, error: 'Exhibition not found' });
      return;
    }

    const conflicts: { artworkId: string; exhibitionId: string; exhibitionTitle: string }[] = [];

    const currentArtworkIds = currentExhibition.artworks.map((a: ExhibitionArtwork) => a.artworkId);

    for (const other of exhibitionsData.exhibitions) {
      if (other.id === id) continue;

      const overlaps = dateRangesOverlap(
        currentExhibition.startDate,
        currentExhibition.endDate,
        other.startDate,
        other.endDate
      );

      if (!overlaps) continue;

      for (const artwork of other.artworks) {
        if (currentArtworkIds.includes(artwork.artworkId)) {
          conflicts.push({
            artworkId: artwork.artworkId,
            exhibitionId: other.id,
            exhibitionTitle: other.title,
          });
        }
      }
    }

    res.json({ success: true, data: conflicts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check conflicts' });
  }
});

router.get('/:id/artworks', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const exhibitionsData = readJsonFile<ExhibitionData>(EXHIBITIONS_FILE);
    const artworksData = readJsonFile<ArtworkData>(ARTWORKS_FILE);

    const exhibition = exhibitionsData.exhibitions.find((e: Exhibition) => e.id === id);
    if (!exhibition) {
      res.status(404).json({ success: false, error: 'Exhibition not found' });
      return;
    }

    const exhibitionArtworks = exhibition.artworks.map((ea: ExhibitionArtwork) => {
      const artwork = artworksData.artworks.find((a) => a.id === ea.artworkId);
      return {
        ...ea,
        artwork,
      };
    }).filter((item: { artwork: unknown }) => item.artwork);

    res.json({ success: true, data: exhibitionArtworks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch exhibition artworks' });
  }
});

function dateRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 <= e2 && s2 <= e1;
}

export default router;
