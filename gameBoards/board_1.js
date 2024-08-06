import * as THREE from 'three'
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import GameBoard from './GameBoard'

class Board_1 extends GameBoard {
    constructor() {
        super()
    }

    mount() {

        const groundGeometry = new THREE.PlaneGeometry(1 / 2, 1 / 2);  // Increased size for better area coverage
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.set(0, 0, 0);  // Centered at origin for easier boundary calculations
        this.add(groundMesh);

        // Add physics for the ground
        const groundBody = window.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
        const groundCollider = window.world.createCollider(RAPIER.ColliderDesc.cuboid(1 / 4, 0, 1 / 4), groundBody);

        this.rigidBodies.push(groundBody)
        this.colliders.push(groundCollider)

        // Create walls
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true });
        const wallThickness = 0.2;
        const wallHeight = 1 / 4;
        const wallPositions = [
            { x: 0, y: wallHeight / 2, z: wallHeight / 2 }, // North wall
            { x: wallHeight / 2, y: wallHeight / 2, z: 0 },  // East wall
            { x: 0, y: wallHeight / 2, z: -wallHeight / 2 }, // South wall
            { x: -wallHeight / 2, y: wallHeight / 2, z: 0 }  // West wall
        ];

        const wallSizes = [
            { x: 1 / 2, y: wallHeight, z: 0 }, // North and South walls
            { x: 0, y: wallHeight, z: 1 / 2 }  // East and West walls
        ];

        wallPositions.forEach((pos, index) => {
            const wallGeometry = new THREE.BoxGeometry(wallSizes[index % 2].x, wallSizes[index % 2].y, wallSizes[index % 2].z);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(pos.x, pos.y, pos.z);
            this.add(wallMesh);

            // Add physics for walls
            const wallBody = window.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z));
            const wallCollider = window.world.createCollider(RAPIER.ColliderDesc.cuboid(wallSizes[index % 2].x / 2, wallSizes[index % 2].y / 2, wallSizes[index % 2].z / 2), wallBody, new RAPIER.Vector3(pos.x, pos.y, pos.z));
            wallCollider.setCollisionGroups(0x110D0004);
            wallCollider.setSolverGroups(0x110D0004);

            this.rigidBodies.push(wallBody)
            this.colliders.push(wallCollider)
        });

    }

    update() {

    }
}

export default Board_1; 