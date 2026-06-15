import MidiWriter from 'midi-writer-js';
const TRACK_CHANNEL_MAP = {
    melody: 0,
    chord: 1,
    percussion: 9,
};
function pitchToName(pitch) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteName = notes[pitch % 12];
    return `${noteName}${octave}`;
}
export function encodeMIDI(tracks, notes) {
    const writer = new MidiWriter.Writer();
    tracks.forEach((track) => {
        if (track.muted)
            return;
        const midiTrack = new MidiWriter.Track();
        const channel = TRACK_CHANNEL_MAP[track.type] ?? 0;
        midiTrack.setTempo(120, 0);
        midiTrack.addTrackName(track.name);
        const trackNotes = notes
            .filter((n) => n.trackId === track.id)
            .sort((a, b) => a.start - b.start);
        let cursorTick = 0;
        trackNotes.forEach((note) => {
            const waitTicks = note.start - cursorTick;
            if (waitTicks > 0) {
                midiTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: ['C0'],
                    duration: `T${waitTicks}`,
                    velocity: 0,
                    channel,
                    wait: waitTicks > 0 ? `T${waitTicks}` : undefined,
                }));
            }
            const velocity = Math.round((track.volume / 100) * 127);
            const tickDuration = Math.max(note.duration, 8);
            if (track.type === 'chord') {
                const rootPitch = note.pitch;
                const pitches = [rootPitch, rootPitch + 4, rootPitch + 7];
                midiTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: pitches.map((p) => pitchToName(p)),
                    duration: `T${tickDuration}`,
                    velocity,
                    channel,
                }));
            }
            else if (track.type === 'percussion') {
                midiTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: [pitchToName(Math.min(Math.max(note.pitch, 35), 81))],
                    duration: `T${tickDuration}`,
                    velocity,
                    channel: 9,
                }));
            }
            else {
                midiTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: [pitchToName(note.pitch)],
                    duration: `T${tickDuration}`,
                    velocity,
                    channel,
                }));
            }
            cursorTick = note.start + tickDuration;
        });
        writer.addTrack(midiTrack);
    });
    const dataArray = writer.buildFile();
    return Buffer.from(dataArray);
}
