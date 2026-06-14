import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { fileStorage } from '../storage/fileStorage';
import type {
  Station,
  CreateStationRequest,
  UpdateStationRequest,
  CreateSeasonRequest,
  CreateEpisodeRequest,
  ReorderEpisodesRequest
} from '../types';

const router = Router();

router.get('/', async (_req: Request, res: Response<Station[]>) => {
  try {
    const stations = await fileStorage.getStations();
    res.json(stations);
  } catch (error) {
    res.status(500).json([] as unknown as Station[]);
  }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response<Station | { error: string }>) => {
  try {
    const stations = await fileStorage.getStations();
    const station = stations.find(s => s.id === req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request<unknown, unknown, CreateStationRequest>, res: Response<Station | { error: string }>) => {
  try {
    const { name, description, coverUrl, category } = req.body;
    if (!name || !description || !coverUrl || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newStation: Station = {
      id: uuidv4(),
      name,
      description,
      coverUrl,
      category,
      createdAt: Date.now(),
      seasons: []
    };

    const stations = await fileStorage.getStations();
    stations.push(newStation);
    await fileStorage.saveStations(stations);
    res.json(newStation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request<{ id: string }, unknown, UpdateStationRequest>, res: Response<Station | { error: string }>) => {
  try {
    const { name, description, coverUrl, category } = req.body;
    const stations = await fileStorage.getStations();
    const index = stations.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Station not found' });
    }

    stations[index] = {
      ...stations[index],
      name: name || stations[index].name,
      description: description || stations[index].description,
      coverUrl: coverUrl || stations[index].coverUrl,
      category: category || stations[index].category
    };

    await fileStorage.saveStations(stations);
    res.json(stations[index]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response<{ success: boolean; error?: string }>) => {
  try {
    const stations = await fileStorage.getStations();
    const filtered = stations.filter(s => s.id !== req.params.id);
    
    if (filtered.length === stations.length) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }

    await fileStorage.saveStations(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/:id/seasons', async (req: Request<{ id: string }, unknown, CreateSeasonRequest>, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stations = await fileStorage.getStations();
    const stationIndex = stations.findIndex(s => s.id === req.params.id);
    
    if (stationIndex === -1) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const newSeason = {
      id: uuidv4(),
      name,
      description: description || '',
      episodes: []
    };

    stations[stationIndex].seasons.push(newSeason);
    await fileStorage.saveStations(stations);
    res.json(newSeason);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/seasons/:seasonId/episodes', async (req: Request<{ id: string; seasonId: string }, unknown, CreateEpisodeRequest>, res: Response) => {
  try {
    const { title, description, duration, audioUrl } = req.body;
    if (!title || !duration || !audioUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stations = await fileStorage.getStations();
    const station = stations.find(s => s.id === req.params.id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const season = station.seasons.find(s => s.id === req.params.seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    const newEpisode = {
      id: uuidv4(),
      title,
      description: description || '',
      duration,
      audioUrl,
      order: season.episodes.length
    };

    season.episodes.push(newEpisode);
    await fileStorage.saveStations(stations);
    res.json(newEpisode);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/seasons/:seasonId/episodes/reorder', async (req: Request<{ id: string; seasonId: string }, unknown, ReorderEpisodesRequest>, res: Response) => {
  try {
    const { episodeIds } = req.body;
    if (!Array.isArray(episodeIds)) {
      return res.status(400).json({ error: 'Invalid episodeIds' });
    }

    const stations = await fileStorage.getStations();
    const station = stations.find(s => s.id === req.params.id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const season = station.seasons.find(s => s.id === req.params.seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    const episodeMap = new Map(season.episodes.map(e => [e.id, e]));
    const reordered = episodeIds.map((id, index) => {
      const ep = episodeMap.get(id);
      return ep ? { ...ep, order: index } : null;
    }).filter(Boolean);

    season.episodes = reordered as typeof season.episodes;
    await fileStorage.saveStations(stations);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
