// Board base class

import * as THREE from 'three'

// a GameBoard is a unique xrFruitMania map. 

class GameBoard extends THREE.Group {
    constructor() {
        super()

        this.rigidBodies = []
        this.colliders = []
    }

    ummount() {
        // three.js
        while (this.children.length > 0) {
            this.remove(this.children[0]);
        }

        // rapier

        for (let i = 0; i < this.rigidBodies.length; i++) {
            window.world.removeRigidBody(this.rigidBodies[i])
        }

        for (let i = 0; i < this.colliders.length; i++) {
            window.world.removeCollider(this.colliders[i])
        }

    }

    update() {
        // fill 
    }
}

export default GameBoard;