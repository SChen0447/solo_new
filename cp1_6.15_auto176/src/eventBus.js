export class EventBus {
    constructor() {
        Object.defineProperty(this, "events", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);
        return () => this.off(event, callback);
    }
    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    emit(event, data) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => {
                callback(data);
            });
        }
    }
    clear() {
        this.events.clear();
    }
}
export const eventBus = new EventBus();
export const EVENTS = {
    ROOM_CHANGE: 'room:change',
    WALL_COLOR_CHANGE: 'wall:colorChange',
    FLOOR_MATERIAL_CHANGE: 'floor:materialChange',
    FURNITURE_SELECT: 'furniture:select',
    FURNITURE_SIZE_CHANGE: 'furniture:sizeChange',
    FURNITURE_POSITION_CHANGE: 'furniture:positionChange',
    LIGHT_DIRECTION_CHANGE: 'light:directionChange',
    SNAPSHOT_SAVE: 'snapshot:save',
    SNAPSHOT_LOAD: 'snapshot:load',
    SCENE_READY: 'scene:ready',
    PARAMS_UPDATE: 'params:update',
};
