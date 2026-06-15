import { AppState, Action, Note } from '../types';

export const initialState: AppState = {
  notes: new Map(),
  clientId: null,
  isConnected: false,
  showVotePanel: false,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT': {
      const notesMap = new Map<string, Note>();
      action.payload.notes.forEach((note) => {
        notesMap.set(note.id, note);
      });
      return {
        ...state,
        notes: notesMap,
        clientId: action.payload.clientId,
      };
    }

    case 'NOTE_ADDED': {
      const newNotes = new Map(state.notes);
      newNotes.set(action.payload.id, action.payload);
      return { ...state, notes: newNotes };
    }

    case 'NOTE_MOVED': {
      const newNotes = new Map(state.notes);
      const note = newNotes.get(action.payload.id);
      if (note) {
        newNotes.set(action.payload.id, {
          ...note,
          x: action.payload.x,
          y: action.payload.y,
        });
      }
      return { ...state, notes: newNotes };
    }

    case 'NOTE_UPDATED': {
      const newNotes = new Map(state.notes);
      const note = newNotes.get(action.payload.id);
      if (note) {
        newNotes.set(action.payload.id, {
          ...note,
          text: action.payload.text ?? note.text,
          color: action.payload.color ?? note.color,
        });
      }
      return { ...state, notes: newNotes };
    }

    case 'NOTE_DELETED': {
      const newNotes = new Map(state.notes);
      newNotes.delete(action.payload.id);
      return { ...state, notes: newNotes };
    }

    case 'VOTE_UPDATED': {
      const newNotes = new Map(state.notes);
      const note = newNotes.get(action.payload.noteId);
      if (note) {
        const isCurrentUser = state.clientId === action.payload.voterId;
        newNotes.set(action.payload.noteId, {
          ...note,
          upvotes: action.payload.upvotes,
          downvotes: action.payload.downvotes,
          userVote: isCurrentUser ? action.payload.voteType : note.userVote,
        });
      }
      return { ...state, notes: newNotes };
    }

    case 'NOTES_MERGED': {
      const newNotes = new Map(state.notes);
      newNotes.delete(action.payload.sourceId);
      const targetNote = newNotes.get(action.payload.targetId);
      if (targetNote) {
        newNotes.set(action.payload.targetId, {
          ...targetNote,
          text: action.payload.mergedText,
          upvotes: action.payload.upvotes,
          downvotes: action.payload.downvotes,
        });
      }
      return { ...state, notes: newNotes };
    }

    case 'ALL_CLEARED': {
      return { ...state, notes: new Map() };
    }

    case 'SET_CONNECTED': {
      return { ...state, isConnected: action.payload };
    }

    case 'TOGGLE_VOTE_PANEL': {
      return { ...state, showVotePanel: !state.showVotePanel };
    }

    case 'SET_USER_VOTE': {
      const newNotes = new Map(state.notes);
      const note = newNotes.get(action.payload.noteId);
      if (note) {
        newNotes.set(action.payload.noteId, {
          ...note,
          userVote: action.payload.voteType,
        });
      }
      return { ...state, notes: newNotes };
    }

    default:
      return state;
  }
}
