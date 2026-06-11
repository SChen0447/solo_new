export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  lineWidth: number;
  opacity: number;
  createdAt: number;
}

export interface TextLabel {
  id: string;
  userId: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  createdAt: number;
}

export interface StickyNote {
  id: string;
  userId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  createdAt: number;
}

export type DrawObject = Stroke | TextLabel | StickyNote;

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
}

export type ToolType = 'pen' | 'eraser' | 'text' | 'sticky' | 'pan';

export interface PenSettings {
  color: string;
  lineWidth: number;
  opacity: number;
}

export interface TextSettings {
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export type DrawCommandType =
  | 'stroke:start'
  | 'stroke:point'
  | 'stroke:end'
  | 'text:add'
  | 'text:update'
  | 'sticky:add'
  | 'sticky:update'
  | 'sticky:move'
  | 'object:delete'
  | 'canvas:clear'
  | 'cursor:move';

export interface BaseCommand {
  type: DrawCommandType;
  userId: string;
  timestamp: number;
}

export interface StrokeStartCommand extends BaseCommand {
  type: 'stroke:start';
  strokeId: string;
  point: Point;
  color: string;
  lineWidth: number;
  opacity: number;
}

export interface StrokePointCommand extends BaseCommand {
  type: 'stroke:point';
  strokeId: string;
  point: Point;
}

export interface StrokeEndCommand extends BaseCommand {
  type: 'stroke:end';
  strokeId: string;
}

export interface TextAddCommand extends BaseCommand {
  type: 'text:add';
  textLabel: TextLabel;
}

export interface TextUpdateCommand extends BaseCommand {
  type: 'text:update';
  textLabel: TextLabel;
}

export interface StickyAddCommand extends BaseCommand {
  type: 'sticky:add';
  stickyNote: StickyNote;
}

export interface StickyUpdateCommand extends BaseCommand {
  type: 'sticky:update';
  stickyNote: StickyNote;
}

export interface StickyMoveCommand extends BaseCommand {
  type: 'sticky:move';
  id: string;
  x: number;
  y: number;
}

export interface ObjectDeleteCommand extends BaseCommand {
  type: 'object:delete';
  id: string;
}

export interface CanvasClearCommand extends BaseCommand {
  type: 'canvas:clear';
}

export interface CursorMoveCommand extends BaseCommand {
  type: 'cursor:move';
  point: Point;
}

export type DrawCommand =
  | StrokeStartCommand
  | StrokePointCommand
  | StrokeEndCommand
  | TextAddCommand
  | TextUpdateCommand
  | StickyAddCommand
  | StickyUpdateCommand
  | StickyMoveCommand
  | ObjectDeleteCommand
  | CanvasClearCommand
  | CursorMoveCommand;

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastError?: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}
