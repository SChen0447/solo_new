import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus, EVENTS } from './eventBus';
import { roomTemplates, } from './roomData';
import { v4 as uuidv4 } from 'uuid';
export class RoomScene {
    constructor(containerId) {
        Object.defineProperty(this, "container", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "camera", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "renderer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "controls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "roomGroup", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new THREE.Group()
        });
        Object.defineProperty(this, "walls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "floor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "furnitureMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "ambientLight", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "directionalLight", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "currentRoomType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'livingRoom'
        });
        Object.defineProperty(this, "currentParams", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "floorMaterials", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "selectedFurnitureId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "raycaster", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new THREE.Raycaster()
        });
        Object.defineProperty(this, "mouse", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new THREE.Vector2()
        });
        Object.defineProperty(this, "animationFrameId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "isTransitioning", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container "${containerId}" not found`);
        }
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(8, 8, 12);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        container.appendChild(this.renderer.domElement);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -15;
        this.directionalLight.shadow.camera.right = 15;
        this.directionalLight.shadow.camera.top = 15;
        this.directionalLight.shadow.camera.bottom = -15;
        this.directionalLight.shadow.bias = -0.001;
        this.scene.add(this.directionalLight);
        this.scene.add(this.directionalLight.target);
        this.scene.add(this.roomGroup);
        this.currentParams = { ...roomTemplates.livingRoom.defaultParams };
        this.createFloorTextures();
        this.bindEvents();
        this.setLightDirection(45);
        this.loadRoom('livingRoom');
        this.animate();
        window.addEventListener('resize', this.onResize.bind(this));
        eventBus.emit(EVENTS.SCENE_READY, {
            roomType: this.currentRoomType,
            params: { ...this.currentParams },
        });
    }
    createFloorTextures() {
        const woodTexture = this.createWoodTexture();
        const tileTexture = this.createTileTexture();
        const carpetTexture = this.createCarpetTexture();
        this.floorMaterials.set('wood', { type: 'wood', texture: woodTexture });
        this.floorMaterials.set('tile', { type: 'tile', texture: tileTexture });
        this.floorMaterials.set('carpet', { type: 'carpet', texture: carpetTexture });
    }
    createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const baseColor = '#c19a6b';
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 40; i++) {
            const y = Math.random() * 512;
            const height = 5 + Math.random() * 20;
            const alpha = 0.1 + Math.random() * 0.3;
            ctx.fillStyle = `rgba(101, 67, 33, ${alpha})`;
            ctx.fillRect(0, y, 512, height);
        }
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 1 + Math.random() * 3;
            const alpha = 0.1 + Math.random() * 0.2;
            ctx.fillStyle = `rgba(139, 90, 43, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    createTileTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const tileSize = 128;
        const groutSize = 4;
        for (let x = 0; x < 512; x += tileSize) {
            for (let y = 0; y < 512; y += tileSize) {
                const brightness = 180 + Math.random() * 40;
                ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness + 10})`;
                ctx.fillRect(x, y, tileSize - groutSize, tileSize - groutSize);
                const gradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
                gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.05)');
                gradient.addColorStop(1, 'rgba(255,255,255,0.05)');
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, tileSize - groutSize, tileSize - groutSize);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    createCarpetTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const brightness = Math.random();
            const gray = 80 + brightness * 60;
            ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray + 5}, 0.5)`;
            ctx.fillRect(x, y, 1, 2);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    bindEvents() {
        this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
        eventBus.on(EVENTS.ROOM_CHANGE, (data) => {
            this.loadRoom(data.roomType);
        });
        eventBus.on(EVENTS.WALL_COLOR_CHANGE, (data) => {
            this.updateWallColor(data.color);
        });
        eventBus.on(EVENTS.FLOOR_MATERIAL_CHANGE, (data) => {
            this.updateFloorMaterial(data.material);
        });
        eventBus.on(EVENTS.FURNITURE_SIZE_CHANGE, (data) => {
            this.updateFurnitureSize(data.id, data.size);
        });
        eventBus.on(EVENTS.FURNITURE_POSITION_CHANGE, (data) => {
            this.updateFurniturePosition(data.id, data.position);
        });
        eventBus.on(EVENTS.LIGHT_DIRECTION_CHANGE, (data) => {
            this.setLightDirection(data.angle);
        });
        eventBus.on(EVENTS.SNAPSHOT_SAVE, () => {
            this.saveSnapshot();
        });
        eventBus.on(EVENTS.SNAPSHOT_LOAD, (data) => {
            this.loadSnapshot(data);
        });
    }
    loadRoom(roomType) {
        if (this.isTransitioning)
            return;
        const template = roomTemplates[roomType];
        if (!template)
            return;
        this.isTransitioning = true;
        this.currentRoomType = roomType;
        this.currentParams = { ...template.defaultParams };
        this.animateRoomTransition(() => {
            this.clearRoom();
            this.createRoom(template);
            this.isTransitioning = false;
            eventBus.emit(EVENTS.PARAMS_UPDATE, {
                roomType: this.currentRoomType,
                params: { ...this.currentParams },
                furniture: this.getCurrentFurnitureData(),
            });
        });
    }
    animateRoomTransition(callback) {
        const duration = 500;
        const startTime = performance.now();
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const fadeProgress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
            const easeProgress = this.easeInOutCubic(fadeProgress);
            this.roomGroup.traverse((obj) => {
                if (obj.isMesh) {
                    const mesh = obj;
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m) => {
                            const mat = m;
                            if (mat.opacity !== undefined) {
                                mat.opacity = easeProgress;
                            }
                        });
                    }
                    else {
                        const mat = mesh.material;
                        if (mat.opacity !== undefined) {
                            mat.opacity = easeProgress;
                        }
                    }
                }
            });
            if (progress < 0.5) {
                requestAnimationFrame(animate);
            }
            else if (progress >= 0.5 && progress < 0.51) {
                callback();
                requestAnimationFrame(animate);
            }
            else if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    clearRoom() {
        while (this.roomGroup.children.length > 0) {
            const child = this.roomGroup.children[0];
            this.roomGroup.remove(child);
        }
        this.walls = [];
        this.floor = null;
        this.furnitureMap.clear();
        this.selectedFurnitureId = null;
    }
    createRoom(template) {
        const { roomSize } = template;
        const w = roomSize.width;
        const h = roomSize.height;
        const d = roomSize.depth;
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.currentParams.wallColor),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
        });
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMaterial.clone());
        backWall.position.set(0, h / 2, -d / 2);
        backWall.receiveShadow = true;
        this.roomGroup.add(backWall);
        this.walls.push(backWall);
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMaterial.clone());
        frontWall.position.set(0, h / 2, d / 2);
        frontWall.receiveShadow = true;
        this.roomGroup.add(frontWall);
        this.walls.push(frontWall);
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMaterial.clone());
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-w / 2, h / 2, 0);
        leftWall.receiveShadow = true;
        this.roomGroup.add(leftWall);
        this.walls.push(leftWall);
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMaterial.clone());
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(w / 2, h / 2, 0);
        rightWall.receiveShadow = true;
        this.roomGroup.add(rightWall);
        this.walls.push(rightWall);
        const floorMaterialData = this.floorMaterials.get(this.currentParams.floorMaterial);
        if (floorMaterialData) {
            const floorMat = new THREE.MeshStandardMaterial({
                map: floorMaterialData.texture.clone(),
            });
            floorMat.map.wrapS = THREE.RepeatWrapping;
            floorMat.map.wrapT = THREE.RepeatWrapping;
            floorMat.map.repeat.set(w / 2, d / 2);
            this.floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
            this.floor.rotation.x = -Math.PI / 2;
            this.floor.receiveShadow = true;
            this.roomGroup.add(this.floor);
        }
        template.furniture.forEach((furnitureData) => {
            this.createFurniture(furnitureData);
        });
        this.updateAmbientLightColor();
        this.roomGroup.position.y = 0;
    }
    createFurniture(data) {
        const group = new THREE.Group();
        const { width, depth, height } = data.size;
        let mesh;
        const color = new THREE.Color(data.color);
        switch (data.type) {
            case 'sofa':
                mesh = this.createSofa(width, depth, height, color);
                break;
            case 'bed':
                mesh = this.createBed(width, depth, height, color);
                break;
            case 'cabinet':
                mesh = this.createCabinet(width, depth, height, color);
                break;
            case 'island':
            case 'coffeeTable':
            case 'diningTable':
            case 'nightstand':
            case 'dresser':
                mesh = this.createTable(width, depth, height, color, data.type);
                break;
            case 'chair':
                mesh = this.createChair(width, depth, height, color);
                break;
            case 'lamp':
                mesh = this.createLamp(width, depth, height, color);
                break;
            case 'wardrobe':
                mesh = this.createWardrobe(width, depth, height, color);
                break;
            case 'fridge':
                mesh = this.createFridge(width, depth, height, color);
                break;
            case 'stove':
            case 'sink':
                mesh = this.createAppliance(width, depth, height, color, data.type);
                break;
            default:
                mesh = this.createBox(width, height, depth, color);
        }
        group.add(mesh);
        group.position.set(data.position.x, height / 2, data.position.z);
        group.userData = { furnitureId: data.id, furnitureType: data.type };
        this.roomGroup.add(group);
        this.furnitureMap.set(data.id, { data: { ...data }, group, mesh });
    }
    createBox(w, h, d, color) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        const material = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    createSofa(w, d, h, color) {
        const group = new THREE.Group();
        const baseGeo = new THREE.BoxGeometry(w, h * 0.4, d);
        const baseMat = new THREE.MeshStandardMaterial({ color });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = h * 0.2;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        const backGeo = new THREE.BoxGeometry(w, h * 0.6, d * 0.15);
        const back = new THREE.Mesh(backGeo, baseMat);
        back.position.set(0, h * 0.5, -d * 0.42);
        back.castShadow = true;
        group.add(back);
        const armGeo = new THREE.BoxGeometry(d * 0.15, h * 0.5, d);
        const leftArm = new THREE.Mesh(armGeo, baseMat);
        leftArm.position.set(-w * 0.42, h * 0.35, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, baseMat);
        rightArm.position.set(w * 0.42, h * 0.35, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createBed(w, d, h, color) {
        const group = new THREE.Group();
        const frameGeo = new THREE.BoxGeometry(w, h * 0.3, d);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = h * 0.15;
        frame.castShadow = true;
        frame.receiveShadow = true;
        group.add(frame);
        const mattressGeo = new THREE.BoxGeometry(w * 0.95, h * 0.4, d * 0.95);
        const mattressMat = new THREE.MeshStandardMaterial({ color });
        const mattress = new THREE.Mesh(mattressGeo, mattressMat);
        mattress.position.y = h * 0.5;
        mattress.castShadow = true;
        group.add(mattress);
        const headboardGeo = new THREE.BoxGeometry(w * 0.95, h * 0.8, d * 0.08);
        const headboardMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const headboard = new THREE.Mesh(headboardGeo, headboardMat);
        headboard.position.set(0, h * 0.7, -d * 0.46);
        headboard.castShadow = true;
        group.add(headboard);
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createTable(w, d, h, color, type) {
        const group = new THREE.Group();
        const topGeo = new THREE.BoxGeometry(w, h * 0.1, d);
        const topMat = new THREE.MeshStandardMaterial({ color });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = h * 0.95;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);
        const legSize = Math.min(w, d) * 0.08;
        const legGeo = new THREE.BoxGeometry(legSize, h * 0.9, legSize);
        const legMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8) });
        const positions = [
            [-w / 2 + legSize, h * 0.45, -d / 2 + legSize],
            [w / 2 - legSize, h * 0.45, -d / 2 + legSize],
            [-w / 2 + legSize, h * 0.45, d / 2 - legSize],
            [w / 2 - legSize, h * 0.45, d / 2 - legSize],
        ];
        positions.forEach((pos) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            group.add(leg);
        });
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createChair(w, d, h, color) {
        const group = new THREE.Group();
        const seatGeo = new THREE.BoxGeometry(w, h * 0.1, d);
        const seatMat = new THREE.MeshStandardMaterial({ color });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.y = h * 0.45;
        seat.castShadow = true;
        seat.receiveShadow = true;
        group.add(seat);
        const backGeo = new THREE.BoxGeometry(w, h * 0.45, d * 0.1);
        const back = new THREE.Mesh(backGeo, seatMat);
        back.position.set(0, h * 0.72, -d * 0.45);
        back.castShadow = true;
        group.add(back);
        const legSize = w * 0.12;
        const legGeo = new THREE.BoxGeometry(legSize, h * 0.45, legSize);
        const legMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7) });
        const positions = [
            [-w / 2 + legSize, h * 0.22, -d / 2 + legSize],
            [w / 2 - legSize, h * 0.22, -d / 2 + legSize],
            [-w / 2 + legSize, h * 0.22, d / 2 - legSize],
            [w / 2 - legSize, h * 0.22, d / 2 - legSize],
        ];
        positions.forEach((pos) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            group.add(leg);
        });
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createLamp(w, d, h, color) {
        const group = new THREE.Group();
        const baseGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.4, h * 0.1, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = h * 0.05;
        base.castShadow = true;
        group.add(base);
        const poleGeo = new THREE.CylinderGeometry(w * 0.05, w * 0.05, h * 0.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = h * 0.35;
        pole.castShadow = true;
        group.add(pole);
        const shadeGeo = new THREE.ConeGeometry(w * 0.6, h * 0.4, 16, 1, true);
        const shadeMat = new THREE.MeshStandardMaterial({
            color,
            side: THREE.DoubleSide,
            emissive: color,
            emissiveIntensity: 0.3,
        });
        const shade = new THREE.Mesh(shadeGeo, shadeMat);
        shade.position.y = h * 0.75;
        shade.castShadow = true;
        group.add(shade);
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createCabinet(w, d, h, color) {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(w, h, d);
        const bodyMat = new THREE.MeshStandardMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        const countertopGeo = new THREE.BoxGeometry(w * 1.02, h * 0.08, d * 1.05);
        const countertopMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.3,
        });
        const countertop = new THREE.Mesh(countertopGeo, countertopMat);
        countertop.position.y = h + h * 0.04;
        countertop.castShadow = true;
        countertop.receiveShadow = true;
        group.add(countertop);
        const doorHeight = h * 0.85;
        const doorWidth = w * 0.18;
        const doorCount = Math.floor(w / (doorWidth + w * 0.02));
        const doorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color).multiplyScalar(0.9),
        });
        for (let i = 0; i < doorCount; i++) {
            const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, d * 0.03);
            const door = new THREE.Mesh(doorGeo, doorMat);
            const xPos = -w / 2 + doorWidth / 2 + i * (doorWidth + w * 0.02) + w * 0.02;
            door.position.set(xPos, doorHeight / 2 + h * 0.05, d / 2 + d * 0.015);
            door.castShadow = true;
            group.add(door);
            const handleGeo = new THREE.BoxGeometry(doorWidth * 0.6, h * 0.03, d * 0.02);
            const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
            const handle = new THREE.Mesh(handleGeo, handleMat);
            handle.position.set(xPos, h * 0.5, d / 2 + d * 0.04);
            group.add(handle);
        }
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createWardrobe(w, d, h, color) {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(w, h, d);
        const bodyMat = new THREE.MeshStandardMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        const doorGeo = new THREE.BoxGeometry(w * 0.45, h * 0.9, d * 0.05);
        const doorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.9) });
        const leftDoor = new THREE.Mesh(doorGeo, doorMat);
        leftDoor.position.set(-w * 0.25, h / 2, d * 0.52);
        leftDoor.castShadow = true;
        group.add(leftDoor);
        const rightDoor = new THREE.Mesh(doorGeo, doorMat);
        rightDoor.position.set(w * 0.25, h / 2, d * 0.52);
        rightDoor.castShadow = true;
        group.add(rightDoor);
        const handleGeo = new THREE.BoxGeometry(w * 0.02, h * 0.08, d * 0.02);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
        const leftHandle = new THREE.Mesh(handleGeo, handleMat);
        leftHandle.position.set(-w * 0.05, h * 0.5, d * 0.56);
        group.add(leftHandle);
        const rightHandle = new THREE.Mesh(handleGeo, handleMat);
        rightHandle.position.set(w * 0.05, h * 0.5, d * 0.56);
        group.add(rightHandle);
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createFridge(w, d, h, color) {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(w, h, d);
        const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        const doorLineGeo = new THREE.BoxGeometry(w * 0.95, h * 0.01, d * 0.02);
        const doorLineMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const doorLine = new THREE.Mesh(doorLineGeo, doorLineMat);
        doorLine.position.set(0, h * 0.3, d * 0.51);
        group.add(doorLine);
        const handleGeo = new THREE.BoxGeometry(w * 0.05, h * 0.15, d * 0.03);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(w * 0.35, h * 0.6, d * 0.52);
        group.add(handle);
        const merged = this.groupToSingleMesh(group, color);
        return merged;
    }
    createAppliance(w, d, h, color, type) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        const material = new THREE.MeshStandardMaterial({ color, metalness: 0.5 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    groupToSingleMesh(group, defaultColor) {
        let mainMesh = null;
        group.traverse((obj) => {
            if (obj.isMesh && !mainMesh) {
                mainMesh = obj;
            }
        });
        if (mainMesh) {
            return mainMesh;
        }
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: defaultColor });
        return new THREE.Mesh(geo, mat);
    }
    updateWallColor(color) {
        this.currentParams.wallColor = color;
        const threeColor = new THREE.Color(color);
        this.walls.forEach((wall) => {
            const mat = wall.material;
            this.animateColor(mat.color, threeColor, 300);
        });
        this.updateAmbientLightColor();
    }
    animateColor(targetColor, endColor, duration) {
        const startColor = targetColor.clone();
        const startTime = performance.now();
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            targetColor.lerpColors(startColor, endColor, eased);
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    updateFloorMaterial(materialType) {
        if (!this.floor)
            return;
        if (this.currentParams.floorMaterial === materialType)
            return;
        const newMaterialData = this.floorMaterials.get(materialType);
        if (!newMaterialData)
            return;
        this.animateFloorTexture(materialType);
        this.currentParams.floorMaterial = materialType;
    }
    animateFloorTexture(targetType) {
        if (!this.floor)
            return;
        const currentMat = this.floor.material;
        const targetMaterialData = this.floorMaterials.get(targetType);
        if (!targetMaterialData)
            return;
        const duration = 1000;
        const startTime = performance.now();
        const oldMap = currentMat.map;
        const newMap = targetMaterialData.texture.clone();
        newMap.wrapS = THREE.RepeatWrapping;
        newMap.wrapT = THREE.RepeatWrapping;
        const template = roomTemplates[this.currentRoomType];
        if (template && newMap) {
            newMap.repeat.set(template.roomSize.width / 2, template.roomSize.depth / 2);
        }
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            if (eased >= 0.5 && oldMap) {
                currentMat.map = newMap;
                currentMat.needsUpdate = true;
            }
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    updateAmbientLightColor() {
        const wallColor = new THREE.Color(this.currentParams.wallColor);
        const hsl = { h: 0, s: 0, l: 0 };
        wallColor.getHSL(hsl);
        const isWarm = hsl.h < 0.12 || hsl.h > 0.9;
        const ambientColor = isWarm
            ? new THREE.Color(0xfff5e6).multiplyScalar(0.8)
            : new THREE.Color(0xe6f5ff).multiplyScalar(0.8);
        this.animateColor(this.ambientLight.color, ambientColor, 500);
    }
    setLightDirection(angleDeg) {
        this.currentParams.lightAngle = angleDeg;
        const angleRad = (angleDeg * Math.PI) / 180;
        const distance = 15;
        const height = 12;
        const x = Math.cos(angleRad) * distance;
        const z = Math.sin(angleRad) * distance;
        this.directionalLight.position.set(x, height, z);
        this.directionalLight.target.position.set(0, 0, 0);
        this.directionalLight.target.updateMatrixWorld();
    }
    onCanvasClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const furnitureMeshes = [];
        this.furnitureMap.forEach((furniture) => {
            furniture.group.traverse((obj) => {
                if (obj.isMesh) {
                    furnitureMeshes.push(obj);
                }
            });
        });
        const intersects = this.raycaster.intersectObjects(furnitureMeshes);
        if (intersects.length > 0) {
            let selectedGroup = null;
            let obj = intersects[0].object;
            while (obj && !obj.userData.furnitureId) {
                obj = obj.parent;
            }
            if (obj && obj.userData.furnitureId) {
                const furnitureId = obj.userData.furnitureId;
                this.selectFurniture(furnitureId);
            }
        }
        else {
            this.deselectFurniture();
        }
    }
    selectFurniture(id) {
        this.deselectFurniture();
        const furniture = this.furnitureMap.get(id);
        if (!furniture)
            return;
        this.selectedFurnitureId = id;
        const edges = new THREE.EdgesGeometry(furniture.mesh.geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0xffaa00,
            linewidth: 2,
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        furniture.group.add(edgeLines);
        furniture.highlightEdges = edgeLines;
        eventBus.emit(EVENTS.FURNITURE_SELECT, {
            furniture: { ...furniture.data },
        });
    }
    deselectFurniture() {
        if (!this.selectedFurnitureId)
            return;
        const furniture = this.furnitureMap.get(this.selectedFurnitureId);
        if (furniture && furniture.highlightEdges) {
            furniture.group.remove(furniture.highlightEdges);
            furniture.highlightEdges = undefined;
        }
        this.selectedFurnitureId = null;
        eventBus.emit(EVENTS.FURNITURE_SELECT, { furniture: null });
    }
    updateFurnitureSize(id, size) {
        const furniture = this.furnitureMap.get(id);
        if (!furniture)
            return;
        furniture.data.size = { ...size };
        this.recreateFurniture(id);
    }
    updateFurniturePosition(id, position) {
        const furniture = this.furnitureMap.get(id);
        if (!furniture)
            return;
        furniture.data.position = { ...position };
        furniture.group.position.x = position.x;
        furniture.group.position.z = position.z;
    }
    recreateFurniture(id) {
        const furniture = this.furnitureMap.get(id);
        if (!furniture)
            return;
        const wasSelected = this.selectedFurnitureId === id;
        this.roomGroup.remove(furniture.group);
        this.createFurniture(furniture.data);
        if (wasSelected) {
            this.selectedFurnitureId = id;
            const newFurniture = this.furnitureMap.get(id);
            if (newFurniture) {
                const edges = new THREE.EdgesGeometry(newFurniture.mesh.geometry);
                const edgeMaterial = new THREE.LineBasicMaterial({
                    color: 0xffaa00,
                    linewidth: 2,
                });
                const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
                newFurniture.group.add(edgeLines);
                newFurniture.highlightEdges = edgeLines;
            }
        }
    }
    getCurrentFurnitureData() {
        const data = [];
        this.furnitureMap.forEach((furniture) => {
            data.push({ ...furniture.data });
        });
        return data;
    }
    saveSnapshot() {
        const snapshot = {
            id: uuidv4(),
            name: `方案 ${Date.now()}`,
            roomType: this.currentRoomType,
            params: { ...this.currentParams },
            furniture: this.getCurrentFurnitureData(),
            thumbnail: this.captureThumbnail(),
        };
        eventBus.emit('snapshot:created', snapshot);
    }
    captureThumbnail() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }
    loadSnapshot(snapshot) {
        if (this.isTransitioning)
            return;
        this.isTransitioning = true;
        this.animateSnapshotTransition(snapshot, () => {
            this.isTransitioning = false;
        });
    }
    animateSnapshotTransition(snapshot, callback) {
        const duration = 1000;
        const startTime = performance.now();
        const startParams = { ...this.currentParams };
        const endParams = { ...snapshot.params };
        const startFurnitureData = this.getCurrentFurnitureData();
        const endFurnitureData = snapshot.furniture;
        const startWallColor = new THREE.Color(startParams.wallColor);
        const endWallColor = new THREE.Color(endParams.wallColor);
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            const currentWallColor = startWallColor.clone().lerp(endWallColor, eased);
            this.walls.forEach((wall) => {
                const mat = wall.material;
                mat.color.copy(currentWallColor);
            });
            this.setLightDirection(startParams.lightAngle + (endParams.lightAngle - startParams.lightAngle) * eased);
            startFurnitureData.forEach((startFurn, index) => {
                const endFurn = endFurnitureData[index];
                if (!endFurn)
                    return;
                const furniture = this.furnitureMap.get(startFurn.id);
                if (!furniture)
                    return;
                furniture.group.position.x =
                    startFurn.position.x + (endFurn.position.x - startFurn.position.x) * eased;
                furniture.group.position.z =
                    startFurn.position.z + (endFurn.position.z - startFurn.position.z) * eased;
            });
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
            else {
                this.currentParams = { ...endParams };
                this.updateAmbientLightColor();
                callback();
            }
        };
        requestAnimationFrame(animate);
    }
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    getCurrentState() {
        return {
            roomType: this.currentRoomType,
            params: { ...this.currentParams },
            furniture: this.getCurrentFurnitureData(),
        };
    }
    dispose() {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.onResize.bind(this));
        this.renderer.dispose();
    }
}
